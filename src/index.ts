import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { IJupyterLabPioneer } from 'jupyterlab-pioneer';
import { Exporter } from 'jupyterlab-pioneer/lib/types';

const PLUGIN_ID = 'jupyterlab-pioneer-custom-event-demo:plugin';

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'A JupyterLab extension that generates telemetry data when users click on a button.',
  autoStart: true,
  requires: [IJupyterLabPioneer, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    pioneer: IJupyterLabPioneer,
    notebookTracker: INotebookTracker
  ) => {
    console.log(`${PLUGIN_ID}`);

    const myExporter_file: Exporter = {
      type: 'file_exporter',
      args: {
        id: '',
        path: 'log'
      }
    };

    const myExporter_console: Exporter = {
      type: 'console_exporter',
    };

    notebookTracker.widgetAdded.connect(async (_, notebookPanel: NotebookPanel) => {
      const notebook = notebookPanel.content;
      
      await notebookPanel.sessionContext.ready;
      notebookPanel.node.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;

        // Cible uniquement les div avec class "next" et un id contenant "-next"
        if (!target.classList.contains('next') || !target.id.endsWith('-next')) return;

        // Récupère l'id du container flashcard à partir de l'id du bouton
        const containerId = target.id.replace('-next', '');
        const flashCardNode = document.getElementById(containerId);
        if (!flashCardNode || !flashCardNode.classList.contains('flip-container')) return;

        const cardnum = flashCardNode.getAttribute('data-cardnum');
        const numCards = flashCardNode.getAttribute('data-numCards');

        const cellNode = flashCardNode.closest('.jp-Cell');
        if (!cellNode) return;

        const index = notebook.widgets.findIndex(cell => cell.node === cellNode);
        if (index === -1) return;

        const cell = notebook.widgets[index];
        if (!(cell instanceof CodeCell)) return;

        const sourceCode = cell.model.sharedModel.source;
        if (!sourceCode.includes('dynamic.display_flashcards(')) return;

        const nextClickEvent = {
          eventName: 'Flashcard Next Click',
          containerId,
          currentCard: cardnum,
          totalCards: numCards,
          eventTime: Date.now(),
          cellIndex: index
        };

        await pioneer.publishEvent(notebookPanel, nextClickEvent, myExporter_file, false);
        await pioneer.publishEvent(notebookPanel, nextClickEvent, myExporter_console, false);
        window.alert("1");
      });




      notebookPanel.node.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const flashCardNode = target.closest('div.flip-container');
        const cardId = flashCardNode?.getAttribute('data-cardnum');
        const nbrCards = flashCardNode?.getAttribute('data-num-cards');

        if (!flashCardNode) return;

        const cellNode = flashCardNode.closest('.jp-Cell');
        if (!cellNode) return;

        const index = notebook.widgets.findIndex(cell => cell.node === cellNode);
        if (index === -1) return;

        const cell = notebook.widgets[index];
        if (!(cell instanceof CodeCell)) return;

        const sourceCode = cell.model.sharedModel.source;
        if (!sourceCode.includes('dynamic.display_flashcards(')) return;

        
        setTimeout(async () => {
          const isFlipped = flashCardNode.classList.contains('flip');

          const flipEvent = {
            cardId: cardId,
            cardNumber: nbrCards,
            eventTime: Date.now(),
            eventName: isFlipped ? "flipped to back" : "flipped to front",
            cellIndex: index
          };
          

          await pioneer.publishEvent(notebookPanel, flipEvent, myExporter_file, false);
          await pioneer.publishEvent(notebookPanel, flipEvent, myExporter_console, false);
          window.alert("2");
        }, 10);
      });
    });
  }
};

export default plugin;