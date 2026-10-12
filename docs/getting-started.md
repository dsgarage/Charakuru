# Getting started with Charakuru

[日本語](getting-started.ja.md) · [한국어](tutorial.ko.md) · [Overview](../README.md)

## Prepare the kit

Use the dedicated distribution ZIP from [Releases](https://github.com/nanocle/Charakuru/releases), rather than GitHub's automatically generated Source code archive. Extract it into any writable folder and keep its files together.

Prepare Node.js 22 or later and a desktop Chromium-based browser. Open the extracted folder in Codex and ask it to read the root `AGENTS.md` and help you start. That file contains setup guidance for the whole kit; nine Skills handle the production workflow.

The agent starts the local app. You can also run `npm start` in the extracted folder and open the displayed local URL. Normal startup does not require `npm install`.

Image production and model production also need the applicable image-generation tools, a signed-in Tripo browser, Blender, Blender MCP and VRM Add-on for Blender. Their accounts, terms and fees are separate.

## Proceed through checkpoints

Import your illustration, review the eight images, choose head and body candidates, adjust proportions and review motion. Copy the app's Continue request into the agent chat and follow the current guides inside the ZIP.

The app saves the canonical `.charakit`; restarting from the same extracted folder reopens the last saved state. The top-right Save button remains available. Keep necessary Blend, VRM and other project outputs when moving the production folder.

Image creation also provides full-body reference views for proportion adjustment. During motion checking, the app displays the VRM intended for final export, with animation and spring physics. While paused, drag the model to check its physics response. Choose "Export VRM," enter the model information, and save it. The separate Preview and Finish tabs have been removed. For screen-by-screen instructions, see the [screenshot tutorial](tutorial.md).

## Get help

Follow [the reporting guide](../CONTRIBUTING.md) for Issues. Do not upload private models, project originals, credentials or personal information. Read the [Terms of Use explained](license.md) and [LICENSE](../LICENSE) before use.
