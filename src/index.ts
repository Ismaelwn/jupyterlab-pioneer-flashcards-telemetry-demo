import {
  JupyterFrontEnd, JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  NotebookPanel, INotebookTracker
} from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { ICellModel } from '@jupyterlab/cells';
import { IJupyterLabPioneer } from 'jupyterlab-pioneer';
import { Exporter } from 'jupyterlab-pioneer/lib/types';


const PLUGIN_ID = 'jupyterlab-pioneer-custom-event-demo:plugin';

function getName(id = ''): string {
  const m = id.match(/^flashcard_(.+?)(?:-.*)?$/);
  return m ? m[1] : '';
}

const plugin: JupyterFrontEndPlugin<void> = {
  id:          PLUGIN_ID,
  description: 'Generates telemetry for flashcard interactions.',
  autoStart:   true,
  requires:    [IJupyterLabPioneer, INotebookTracker],

  activate: async (
    app: JupyterFrontEnd,
    pioneer: IJupyterLabPioneer,
    tracker: INotebookTracker
  ) => {
    console.log(`${PLUGIN_ID} – activated`);

    const fileExporter: Exporter    = { type: 'file_exporter', args: { id: '', path: 'log' } };
    const consoleExporter: Exporter = { type: 'console_exporter' };

    tracker.widgetAdded.connect(async (_, notebookPanel: NotebookPanel) => {
      const notebook = notebookPanel.content;
      await notebookPanel.sessionContext.ready;

      /* -------- état local ------------------------------------------- */
      const pendingOutputs = new Set<HTMLElement>();

      /* -------- IntersectionObserver (≥50 % visible) ----------------- */
      const io = new IntersectionObserver(
        async entries => {
          for (const entry of entries) {
            const oaNode = entry.target as HTMLElement;

            if (entry.isIntersecting) {
              if (!pendingOutputs.has(oaNode)) continue;   // déjà envoyé
              pendingOutputs.delete(oaNode);

              const anchor = oaNode.querySelector('a[id^="flashcard_"]') as HTMLElement | null;
              if (!anchor) continue;
              const LearningObject = getName(anchor.id);

              const cellNode = oaNode.closest('.jp-Cell');
              if (!cellNode) continue;
              const index = notebook.widgets.findIndex(c => c.node === cellNode);
              if (index === -1) continue;

              const outputEvent = {
                Action        : 'Flashcard Output In View',
                cellIndex     : index,
                LearningObject,
                cardId        : anchor.id,          // ← ajouté
                Timestamp     : Date.now()
              };

              await pioneer.publishEvent(notebookPanel, outputEvent, fileExporter, false);
              await pioneer.publishEvent(notebookPanel, outputEvent, consoleExporter, false);
              window.alert(`Output visible : ${LearningObject || '(sans nom)'}`);

            } else {
              /* sortie du viewport → ré-arme pour un prochain passage */
              pendingOutputs.add(oaNode);
            }
          }
        },
        { threshold: 0.5 }
      );

      /* -------- enregistre une CodeCell si c'est display_flashcards ---- */
      function registerCell(cell: CodeCell) {
        if (!cell.model.sharedModel.source.includes('dynamic.display_flashcards(')) return;

        const oaNode = cell.outputArea.node;
        if (!oaNode.querySelector('.flip-container')) return;

        pendingOutputs.add(oaNode);
        io.observe(oaNode);

        cell.outputArea.model.changed.connect(() => {
          if (!oaNode.querySelector('.flip-container')) return;
          pendingOutputs.add(oaNode);
          io.observe(oaNode);
        });
      }

      notebook.widgets.forEach(c => { if (c instanceof CodeCell) registerCell(c); });
      notebook.model?.cells.changed.connect((_, args) => {
        if (args.type === 'add') {
          args.newValues.forEach((model: ICellModel) => {
            const c = notebook.widgets.find(w => w.model === model);
            if (c instanceof CodeCell) registerCell(c);
          });
        }
      });

      /* ========================== « Next » =========================== */
      notebookPanel.node.addEventListener('click', event => {
        const tgt = event.target as HTMLElement;
        if (!tgt.classList.contains('next') || !tgt.id.endsWith('-next')) return;

        const containerId = tgt.id.replace('-next', '');
        const node        = document.getElementById(containerId);
        if (!node?.classList.contains('flip-container')) return;

        const cellNode = node.closest('.jp-Cell');
        if (!cellNode) return;
        const idx = notebook.widgets.findIndex(c => c.node === cellNode);
        if (idx === -1) return;
        const cell = notebook.widgets[idx] as CodeCell;
        if (!cell.model.sharedModel.source.includes('dynamic.display_flashcards(')) return;

        const beforeAnchor = node.querySelector('a[id^="flashcard_"]') as HTMLElement | null;
      
        const fromId   = beforeAnchor?.id || '';

        setTimeout(async () => {
          const afterAnchor = node.querySelector('a[id^="flashcard_"]') as HTMLElement | null;
          const toName = afterAnchor ? getName(afterAnchor.id) : '';
          const toId   = afterAnchor?.id || '';

          const cardnum  = node.getAttribute('data-cardnum');
          const numCards = node.getAttribute('data-numCards');

          const nextEvent = {
            Action        : 'Flashcard Next Click',
            containerId,
            currentCard   : cardnum,
            totalCards    : numCards,
           
            LearningObject  : toName,    
            fromCardId    : fromId,   
            toCardId      : toId,     
            Timestamp     : Date.now(),
            cellIndex     : idx
          };

          await pioneer.publishEvent(notebookPanel, nextEvent, fileExporter, false);
          await pioneer.publishEvent(notebookPanel, nextEvent, consoleExporter, false);

          /* force l’observer pour la nouvelle carte */
          const oaNode = cell.outputArea.node;
          pendingOutputs.add(oaNode);
          io.unobserve(oaNode);
          io.observe(oaNode);
        }, 0);
      });

      /* ========================== « Flip » =========================== */
      notebookPanel.node.addEventListener('click', event => {
        const node = (event.target as HTMLElement).closest('div.flip-container');
        if (!node) return;

        const cellNode = node.closest('.jp-Cell');
        if (!cellNode) return;
        const idx = notebook.widgets.findIndex(c => c.node === cellNode);
        if (idx === -1) return;
        const cell = notebook.widgets[idx] as CodeCell;
        if (!cell.model.sharedModel.source.includes('dynamic.display_flashcards(')) return;

        const anchor = node.querySelector('a[id^="flashcard_"]') as HTMLElement | null;
        const name   = anchor ? getName(anchor.id) : '';
        const idHtml = anchor?.id || '';

        const cardId   = node.getAttribute('data-cardnum');
        const numCards = node.getAttribute('data-num-cards');

        setTimeout(async () => {
          const flipped = node.classList.contains('flip');
          const flipEvent = {
            Action        : flipped ? 'flipped to back' : 'flipped to front',
            LearningObject : name,
            cardId,            // data-cardnum
            numCards,
            cardIdHtml    : idHtml,   // ← ajouté
            Timestamp     : Date.now(),
            cellIndex     : idx
          };

          await pioneer.publishEvent(notebookPanel, flipEvent, fileExporter, false);
          await pioneer.publishEvent(notebookPanel, flipEvent, consoleExporter, false);
        }, 10);
      });
    });
  }
};

export default plugin;
