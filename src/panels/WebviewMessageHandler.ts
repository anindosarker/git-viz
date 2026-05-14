import * as vscode from "vscode";
import path from "path";
import { ConfigBridge } from "../settings/ConfigBridge";
import { GitActionHandler } from "./handlers/GitActionHandler";
import { GitLogHandler } from "./handlers/GitLogHandler";
import { SystemHandler } from "./handlers/SystemHandler";
import { makeActionHandlers } from "./handlers/actions.handler";
import { commitsHandlers } from "./handlers/commits.handler";
import { makeConfigHandlers } from "./handlers/config.handler";
import { diffHandlers } from "./handlers/diff.handler";
import { refsHandlers } from "./handlers/refs.handler";
import { remotesHandlers } from "./handlers/remotes.handler";
import { repoHandlers } from "./handlers/repo.handler";
import { multiRepoHandlers } from "./handlers/multiRepo.handler";
import { CommandHandler, postResponse } from "./handlers/types";

export class WebviewMessageHandler {
  private readonly _webview: vscode.Webview;
  private readonly _gitLogHandler: GitLogHandler;
  private readonly _gitActionHandler: GitActionHandler;
  private readonly _systemHandler: SystemHandler;
  private readonly _registry: Map<string, CommandHandler>;

  constructor(webview: vscode.Webview, configBridge?: ConfigBridge) {
    this._webview = webview;
    this._gitLogHandler = new GitLogHandler(webview);
    this._gitActionHandler = new GitActionHandler(webview);
    this._systemHandler = new SystemHandler();

    const configHandlers = configBridge ? makeConfigHandlers(configBridge) : [];

    this._registry = new Map();
    for (const h of [
      ...repoHandlers,
      ...commitsHandlers,
      ...refsHandlers,
      ...remotesHandlers,
      ...diffHandlers,
      ...multiRepoHandlers,
      ...configHandlers,
      ...makeActionHandlers(),
    ]) {
      this._registry.set(h.command, h);
    }
  }

  public async handleMessage(message: any) {
    const command: string | undefined = message?.command;
    if (!command) return;

    console.log(`[WebviewMessageHandler] Received: ${command}`, message);

    const registered = this._registry.get(command);
    if (registered) {
      const cwd = this.resolveCwd(message.payload);
      if (!cwd) {
        postResponse(this._webview, command, message.id, {
          error: "No workspace folder open",
        });
        return;
      }
      await registered.handle(message.payload, cwd, this._webview, message.id);
      return;
    }

    await this.handleLegacy(message);
  }

  private async handleLegacy(message: any): Promise<void> {
    switch (message.command) {
      case "hello":
        this._systemHandler.handleHello(message.text);
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

  /**
   * Resolves the working directory for a request. Prefers `payload.repoId`
   * when supplied (so multi-root webviews can scope per repo), otherwise
   * falls back to the first workspace folder.
   */
  private resolveCwd(payload: any): string | undefined {
    if (payload && typeof payload === "object") {
      const repoId = (payload as { repoId?: unknown }).repoId;
      if (typeof repoId === "string" && repoId.length > 0) return path.resolve(repoId);
    }
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
  }
}
