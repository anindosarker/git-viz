import { GitBootstrapService } from "@git-viz/backend/GitBootstrapService";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import { CommandHandler, postResponse } from "./types";

const getInfo: CommandHandler = {
  command: "repo:getInfo",
  async handle(_payload, cwd, webview, requestId) {
    try {
      const data = await GitRepoService.getRepoInfo(cwd);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

const bootstrap: CommandHandler = {
  command: "bootstrap",
  async handle(payload, cwd, webview, requestId) {
    try {
      const limit = typeof payload?.limit === "number" && payload.limit > 0 ? payload.limit : 500;
      const order: "topo" | "date" =
        payload?.order === "topo" || payload?.order === "date" ? payload.order : "date";
      const data = await GitBootstrapService.get(cwd, limit, order);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

export const repoHandlers: CommandHandler[] = [getInfo, bootstrap];
