# JUPYTERLAB PIONEER FLASHCARDS TELEMETRY DEMO

A JupyterLab extension that generates telemetry data on console and in a file, when a user interacts with an output of flashcard(s).

This extension is an example of how to write a simple extension that leverages functionalities provided by [`me`](https://github.com/Ismaelwn/) to generate telemetry data for those specific events (capturing interactions between users and an output of flashcards).


## Get started

### Requirements

- JupyterLab >= 4.0.0

### Install

To install the extension, execute:

```bash
pip install git+"https://github.com/Ismaelwn/jupyterlab_pioneer_flashcards_telemetry_demo"
```

### Configuration

To add a data exporter, users need to configure the `jupyterlab-pioneer` extension.

See more details [here](https://github.com/educational-technology-collective/jupyterlab-pioneer#configurations).

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## How to implement a custom event extension

https://github.com/educational-technology-collective/jupyterlab-pioneer-custom-event-demo/blob/main/doc/how-to-implement-a-custom-event-extension.md
#