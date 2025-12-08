import * as vscode from "vscode";
import { GitService } from "../services/GitService";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";

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

  /**
   * The MainPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension
   */
  public static render(extensionUri: vscode.Uri) {
    if (MainPanel.currentPanel) {
      // If the webview panel already exists reveal it
      MainPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      let repoName = "git-viz";
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        repoName = vscode.workspace.workspaceFolders[0].name;
      }

      const panel = vscode.window.createWebviewPanel(
        // Panel view type
        "showHelloWorld",
        // Panel title
        `Commit Graph: ${repoName}`,
        // The editor column the panel should be displayed in
        vscode.ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `web/dist` directories
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, "out"),
            vscode.Uri.joinPath(extensionUri, "web", "dist"),
          ],
        }
      );
      panel.iconPath = vscode.Uri.joinPath(extensionUri, "icon.png");

      MainPanel.currentPanel = new MainPanel(panel, extensionUri);
    }
  }

  /**
   * Registers the panel command with the extension context.
   *
   * @param context The extension context
   */
  public static register(context: vscode.ExtensionContext) {
    const command = vscode.commands.registerCommand(
      "git-viz.showCommitGraph",
      () => {
        MainPanel.render(context.extensionUri);
      }
    );
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
  private _getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, [
      "web",
      "dist",
      "assets",
      "index.css",
    ]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, [
      "web",
      "dist",
      "assets",
      "index.js",
    ]);

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
        const command = message.command;
        const text = message.text;

        console.log(`[MainPanel] Received message: ${command}`, message);

        switch (command) {
          case "hello":
            vscode.window.showInformationMessage(text);
            return;
          case "requestLog":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              try {
                const log = await GitService.getLog(rootPath);
                webview.postMessage({ command: "responseLog", data: log });
              } catch (e) {
                vscode.window.showErrorMessage("Failed to fetch git log");
              }
            } else {
              vscode.window.showErrorMessage("No workspace folder open");
            }
            return;
          case "requestRepoInfo":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              try {
                const info = await GitService.getRepoInfo(rootPath);
                webview.postMessage({
                  command: "responseRepoInfo",
                  data: info,
                });
              } catch (e) {
                // Ignore error
              }
            }
            return;
          case "copyCommitHash":
            vscode.env.clipboard.writeText(message.data);
            return;
          case "checkoutCommit":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              const commitHash = message.data;
              const shortHash = commitHash.substring(0, 7);

              const items: vscode.QuickPickItem[] = [
                {
                  label: "$(check) Checkout to Commit",
                  description: "(detached)",
                  detail: `Will checkout to commit $(git-commit) ${shortHash}`,
                },
                {
                  label:
                    "$(git-branch) Create & Switch to New Branch from Commit",
                  description: "Branch",
                  detail: `Will create and switch to a new branch from commit $(git-commit) ${shortHash}`,
                },
              ];

              const selection = await vscode.window.showQuickPick(items, {
                placeHolder: `Confirm Switch to Commit ${shortHash}`,
              });

              if (!selection) return;

              try {
                if (selection.label.includes("Checkout to Commit")) {
                  await GitService.checkout(rootPath, commitHash);
                  vscode.window.showInformationMessage(
                    `Checked out commit ${shortHash}`
                  );
                } else if (selection.label.includes("Create & Switch")) {
                  const branchName = await vscode.window.showInputBox({
                    prompt: "Enter new branch name",
                    placeHolder: "e.g., feature/my-new-branch",
                  });
                  if (branchName) {
                    await GitService.createBranch(
                      rootPath,
                      branchName,
                      commitHash
                    );
                    await GitService.checkout(rootPath, branchName);
                    vscode.window.showInformationMessage(
                      `Created and checked out branch ${branchName}`
                    );
                  }
                }
                // Trigger log refresh
                webview.postMessage({ command: "refreshLog" });
              } catch (e: any) {
                vscode.window.showErrorMessage(
                  `Failed to checkout commit: ${e.message}`
                );
              }
            }
            return;
          case "checkoutBranch":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              const branchName = message.data;

              const items: vscode.QuickPickItem[] = [
                {
                  label: "$(check) Switch to Branch",
                  description: branchName,
                  detail: `Will switch to branch $(git-branch) ${branchName}`,
                },
              ];

              const selection = await vscode.window.showQuickPick(items, {
                placeHolder: `Confirm Switch to Branch ${branchName}`,
              });

              if (!selection) return;

              try {
                await GitService.checkout(rootPath, branchName);
                vscode.window.showInformationMessage(
                  `Checked out branch ${branchName}`
                );
                webview.postMessage({ command: "refreshLog" });
              } catch (e: any) {
                vscode.window.showErrorMessage(
                  `Failed to checkout branch: ${e.message}`
                );
              }
            }
            return;
          case "deleteBranch":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              const branchName = message.data;
              const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete branch '${branchName}'?`,
                { modal: true },
                "Delete"
              );
              if (answer === "Delete") {
                try {
                  await GitService.deleteBranch(rootPath, branchName);
                  vscode.window.showInformationMessage(
                    `Deleted branch ${branchName}`
                  );
                  webview.postMessage({ command: "refreshLog" });
                } catch (e: any) {
                  vscode.window.showErrorMessage(
                    `Failed to delete branch: ${e.message}`
                  );
                }
              }
            }
            return;
          case "mergeBranch":
            if (
              vscode.workspace.workspaceFolders &&
              vscode.workspace.workspaceFolders.length > 0
            ) {
              const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
              const branchName = message.data;
              const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to merge '${branchName}' into current branch?`,
                { modal: true },
                "Merge"
              );
              if (answer === "Merge") {
                try {
                  await GitService.merge(rootPath, branchName);
                  vscode.window.showInformationMessage(
                    `Merged branch ${branchName}`
                  );
                  webview.postMessage({ command: "refreshLog" });
                } catch (e: any) {
                  vscode.window.showErrorMessage(
                    `Failed to merge branch: ${e.message}`
                  );
                }
              }
            }
            return;
        }
      },
      undefined,
      this._disposables
    );
  }
}
