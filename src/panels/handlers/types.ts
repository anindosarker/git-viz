import * as vscode from "vscode";

export interface WebviewRequest {
  id?: string;
  command: string;
  payload?: any;
}

export interface CommandHandler {
  command: string;
  handle(
    payload: any,
    cwd: string,
    webview: vscode.Webview,
    requestId?: string
  ): Promise<void>;
}

export function postResponse(
  webview: vscode.Webview,
  command: string,
  requestId: string | undefined,
  result: { data?: unknown; error?: string }
): void {
  webview.postMessage({
    id: requestId,
    command: `${command}:response`,
    ...result,
  });
}
