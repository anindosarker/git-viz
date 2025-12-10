import * as vscode from "vscode";

export class SystemHandler {
  public handleHello(text: string) {
    vscode.window.showInformationMessage(text);
  }

  public handleCopyCommitHash(hash: string) {
    vscode.env.clipboard.writeText(hash);
  }
}
