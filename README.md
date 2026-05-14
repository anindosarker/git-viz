# git-viz

A Git history visualizer that runs in two modes from the same React UI:

- **VS Code Extension** — embeds the viewer in a webview panel.
- **Standalone Web Viewer** — serves the UI from a local Node process for any repo.

## Features

- Commit history and branch graph visualization.
- Commit details, authors, and dates.
- Works inside VS Code or in any browser.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)
- [Git](https://git-scm.com/)

## Installation

### From Releases (Manual)

1. Go to the [Releases](https://github.com/anindosarker/git-viz/releases) page.
2. Download the `.vsix` file from the latest release.
3. Open VS Code.
4. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
5. Click the "..." menu at the top right of the Extensions view.
6. Select **Install from VSIX...** and pick the downloaded file.

### From Source

The repository is a pnpm workspace. A single install at the root pulls dependencies for the extension, the web client, the backend, and the shared types package.

```bash
git clone <repository-url>
cd git-viz
pnpm install
```

---

## Running the Standalone Server

Run `git-viz` as a standalone web server to visualize any local git repository in your browser.

1. Build the web client:

   ```bash
   pnpm --filter web build
   ```

2. Start the server against a target repository:

   ```bash
   pnpm --filter @git-viz/server start -- --repo <path-to-repo>
   ```

   Or invoke the built output directly:

   ```bash
   node server/dist/index.js --repo <path-to-repo>
   ```

   If `--repo` is omitted, the server uses the current working directory.

3. Open `http://localhost:3000` in your browser.

---

## Running the VS Code Extension

1. Build the web assets (the extension loads them from `web/dist`):

   ```bash
   pnpm --filter web build
   ```

2. Compile the extension:

   ```bash
   pnpm compile
   ```

3. Open the project in VS Code and press **F5** (or **Run and Debug > Run Extension**) to launch the Extension Host.

4. In the Extension Host window:
   - Open a folder that is a Git repository.
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
   - Run **GitViz: Show Commit Graph**.

   Additional command: **GitViz: Switch Branch**.

## Project Structure

- `src/` — VS Code extension entry point (TypeScript).
- `web/` — React UI shared between extension and standalone modes.
- `backend/` — Git operations backend used by the standalone server.
- `shared/` — Shared TypeScript types between web and backend.
- `server.cjs` — Legacy standalone entry point (being replaced by `server/`).

## Architecture & Plans

Active and historical implementation plans live in [`.ai/plans/`](.ai/plans/). Contributors should read the relevant plan before starting work on a feature; see `docs/code-of-conduct/planning-guidelines.md` for the planning workflow.
