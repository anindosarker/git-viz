import { GitLogService } from "@git-viz/backend/GitLogService";
import { CommandHandler, postResponse } from "./types";

function makeHandler(
  command: string,
  run: (payload: any, cwd: string) => Promise<unknown>
): CommandHandler {
  return {
    command,
    async handle(payload, cwd, webview, requestId) {
      try {
        const data = await run(payload ?? {}, cwd);
        postResponse(webview, this.command, requestId, { data });
      } catch (err: any) {
        postResponse(webview, this.command, requestId, {
          error: err?.message ?? String(err),
        });
      }
    },
  };
}

const getPage = makeHandler("commits:getPage", (p, cwd) => {
  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 500;
  const order: "topo" | "date" = p.order === "topo" ? "topo" : "date";
  return GitLogService.getCommitsPage(cwd, p.cursor, limit, order, p.filter);
});

const getDetails = makeHandler("commits:getDetails", (p, cwd) =>
  GitLogService.getCommitDetails(cwd, p.hash)
);

const getFileChanges = makeHandler("commits:getFileChanges", (p, cwd) =>
  GitLogService.getFileChanges(cwd, p.hash)
);

const getFileDiff = makeHandler("commits:getFileDiff", (p, cwd) =>
  GitLogService.getFileDiff(cwd, p.hash, p.path)
);

const getPatch = makeHandler("commits:getPatch", (p, cwd) => GitLogService.getPatch(cwd, p.hash));

const getCommit = makeHandler("commits:getCommit", (p, cwd) =>
  GitLogService.getCommit(cwd, p.hash)
);

export const commitsHandlers: CommandHandler[] = [
  getPage,
  getDetails,
  getFileChanges,
  getFileDiff,
  getPatch,
  getCommit,
];
