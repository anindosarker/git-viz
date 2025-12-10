import * as vscode from "vscode";
import { GitService } from "../../services/GitService";

export class GitLogHandler {
  private readonly _webview: vscode.Webview;

  constructor(webview: vscode.Webview) {
    this._webview = webview;
  }

  private async getRootPath(): Promise<string | undefined> {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage("No workspace folder open");
    return undefined;
  }

  public async handleRequestLog() {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    try {
      const log = await GitService.getLog(rootPath);
      this._webview.postMessage({ command: "responseLog", data: log });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to fetch git log");
    }
  }

  public async handleRequestRepoInfo() {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    try {
      const info = await GitService.getRepoInfo(rootPath);
      this._webview.postMessage({
        command: "responseRepoInfo",
        data: info,
      });
    } catch (e) {
      // Ignore error
    }
  }
}
