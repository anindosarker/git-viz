import { GitRemoteService } from "@git-viz/backend/GitRemoteService";
import { CommandHandler, postResponse } from "./types";

const list: CommandHandler = {
  command: "remotes:list",
  async handle(_payload, cwd, webview, requestId) {
    try {
      const data = await GitRemoteService.list(cwd);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

export const remotesHandlers: CommandHandler[] = [list];
