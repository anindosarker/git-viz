# git-viz

A Git visualization tool that works both as a **VS Code Extension** and a **Standalone Web Viewer**.

## Features

- Visualize commit history and branches (Git Graph).
- View commit details, authors, and dates.
- Works directly within VS Code or in any browser.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Git](https://git-scm.com/)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd git-viz
   ```

2. Install dependencies for the extension:

   ```bash
   npm install
   ```

3. Install dependencies for the web view:
   ```bash
   cd web
   npm install
   ```

---

## 🚀 Running the Standalone Server

You can run `git-viz` as a standalone web server to visualize any local git repository in your browser.

1. Build the web client:

   ```bash
   cd web
   npm run build
   ```

2. Start the server:

   ```bash
   # Syntax: node server.cjs [path-to-repo]

   # Example: Visualize the current directory
   node server.cjs

   # Example: Visualize a specific repository
   node server.cjs /Users/username/projects/my-app
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 💻 Running the VS Code Extension

To develop or run the extension within VS Code:

1. ensure the web assets are built (the extension loads the built files):

   ```bash
   cd web
   npm run build
   ```

   > **Note:** You can also run `npm run dev` in the `web` folder if you want to develop the UI in a browser first, but the VS Code extension specifically looks for files in `web/dist`.

2. Open the project in VS Code:

   ```bash
   code .
   ```

3. Press **F5** (or go to **Run and Debug** > **Run Extension**) to start the Extension Host window.

4. In the new Extension Host window:
   - Open any folder that is a Git repository.
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
   - Run the command: **Hello World** (This corresponds to `git-viz.helloWorld`).
   - The Git Viz panel will open.

## Project Structure

- `src/`: Source code for the VS Code extension (TypeScript).
- `web/`: Source code for the React-based UI.
  - `web/server.cjs`: Express-like server script for the standalone mode.
  - `web/src/`: React components and logic.
