import * as vscode from "vscode";
import { GitActionHandler } from "./handlers/GitActionHandler";
import { GitLogHandler } from "./handlers/GitLogHandler";
import { SystemHandler } from "./handlers/SystemHandler";

export class WebviewMessageHandler {
  private readonly _gitLogHandler: GitLogHandler;
  private readonly _gitActionHandler: GitActionHandler;
  private readonly _systemHandler: SystemHandler;

  constructor(webview: vscode.Webview) {
    this._gitLogHandler = new GitLogHandler(webview);
    this._gitActionHandler = new GitActionHandler(webview);
    this._systemHandler = new SystemHandler();
  }

  public async handleMessage(message: any) {
    const command = message.command;
    const text = message.text;

    console.log(
      `[WebviewMessageHandler] Received message: ${command}`,
      message
    );

    switch (command) {
      case "hello":
        this._systemHandler.handleHello(text);
        return;
      case "requestLog":
        await this._gitLogHandler.handleRequestLog();
        return;
      case "requestRepoInfo":
        await this._gitLogHandler.handleRequestRepoInfo();
        return;
      case "copyCommitHash":
        this._systemHandler.handleCopyCommitHash(message.data);
        return;
      case "checkoutCommit":
        await this._gitActionHandler.handleCheckoutCommit(message.data);
        return;
      case "checkoutBranch":
        await this._gitActionHandler.handleCheckoutBranch(message.data);
        return;
      case "deleteBranch":
        await this._gitActionHandler.handleDeleteBranch(message.data);
        return;
      case "mergeBranch":
        await this._gitActionHandler.handleMergeBranch(message.data);
        return;
    }
  }
}
