import * as vscode from "vscode";
import type { ConfigBridge } from "../../settings/ConfigBridge";
import { postResponse, type CommandHandler } from "./types";

export function makeConfigHandlers(bridge: ConfigBridge): CommandHandler[] {
  const getAll: CommandHandler = {
    command: "config:getAll",
    async handle(_payload, _cwd, webview: vscode.Webview, requestId) {
      postResponse(webview, this.command, requestId, { data: bridge.readAll() });
    },
  };

  const set: CommandHandler = {
    command: "config:set",
    async handle(payload, _cwd, webview: vscode.Webview, requestId) {
      try {
        const key = String(payload?.key);
        await bridge.set(key, payload?.value);
        postResponse(webview, this.command, requestId, { data: { ok: true } });
      } catch (err) {
        postResponse(webview, this.command, requestId, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };

  return [getAll, set];
}
