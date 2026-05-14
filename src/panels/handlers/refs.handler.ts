import { GitRefService } from "@git-viz/backend/GitRefService";
import { CommandHandler, postResponse } from "./types";

const getAll: CommandHandler = {
  command: "refs:getAll",
  async handle(payload, cwd, webview, requestId) {
    try {
      const includeRemote = payload?.includeRemote !== false;
      const data = await GitRefService.getAll(cwd, includeRemote);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

export const refsHandlers: CommandHandler[] = [getAll];
