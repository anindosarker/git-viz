import * as vscode from "vscode";
import { ConfigBridge } from "../settings/ConfigBridge";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { WebviewMessageHandler } from "./WebviewMessageHandler";

export const MAIN_PANEL_VIEW_TYPE = "git-viz.commitGraph";

export interface OpenGraphArgs {
  kind?: "branch" | "tag" | "head" | "stash" | "commit";
  name?: string;
  hash?: string;
}

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 */
export class MainPanel {
  public static currentPanel: MainPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _messageHandler: WebviewMessageHandler;

  /**
   * The MainPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    configBridge?: ConfigBridge
  ) {
    this._panel = panel;
    this._messageHandler = new WebviewMessageHandler(this._panel.webview, configBridge);

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);

    if (configBridge) {
      const detach = configBridge.attach(this._panel.webview);
      this._disposables.push(detach);
    }

    // Forward color theme changes to the webview so it can re-read CSS vars
    this._disposables.push(
      vscode.window.onDidChangeActiveColorTheme((theme) => {
        void this._panel.webview.postMessage({
          command: "theme:changed",
          kind:
            theme.kind === vscode.ColorThemeKind.Light
              ? "light"
              : theme.kind === vscode.ColorThemeKind.HighContrast
                ? "high-contrast"
                : "dark",
        });
      })
    );
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension
   */
  public static render(
    extensionUri: vscode.Uri,
    configBridge?: ConfigBridge,
    openArgs?: OpenGraphArgs
  ) {
    if (MainPanel.currentPanel) {
      // If the webview panel already exists reveal it
      MainPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      if (openArgs) MainPanel.currentPanel.postOpenArgs(openArgs);
    } else {
      // If a webview panel does not already exist create and show a new one
      let repoName = "git-viz";
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        repoName = vscode.workspace.workspaceFolders[0].name;
      }

      const panel = vscode.window.createWebviewPanel(
        MAIN_PANEL_VIEW_TYPE,
        `Commit Graph: ${repoName}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, "out"),
            vscode.Uri.joinPath(extensionUri, "web", "dist"),
          ],
        }
      );
      panel.iconPath = vscode.Uri.joinPath(extensionUri, "icon.png");

      MainPanel.currentPanel = new MainPanel(panel, extensionUri, configBridge);
      if (openArgs) MainPanel.currentPanel.postOpenArgs(openArgs);
    }
  }

  private postOpenArgs(args: OpenGraphArgs): void {
    void this._panel.webview.postMessage({ command: "graph:open", args });
  }

  public postRefresh(): void {
    void this._panel.webview.postMessage({ command: "graph:refresh" });
  }

  /**
   * Registers the panel command with the extension context.
   *
   * @param context The extension context
   */
  public static register(context: vscode.ExtensionContext) {
    const command = vscode.commands.registerCommand("git-viz.showCommitGraph", () => {
      MainPanel.render(context.extensionUri);
    });
    context.subscriptions.push(command);
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    MainPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["web", "dist", "assets", "index.css"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["web", "dist", "assets", "index.js"]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>git-viz</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context
   *
   * @param webview A reference to the extension webview
   */
  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        await this._messageHandler.handleMessage(message);
      },
      undefined,
      this._disposables
    );
  }
}
