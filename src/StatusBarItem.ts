import * as vscode from "vscode";

export class StatusBarItem {
  private _statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );
    this._statusBarItem.text = "$(git-merge) Show git graph";
    this._statusBarItem.tooltip = "Show Git Graph";
    this._statusBarItem.command = "git-viz.showCommitGraph";
    this._statusBarItem.show();

    context.subscriptions.push(this._statusBarItem);
  }
}
