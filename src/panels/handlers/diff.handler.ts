import { GitLogService } from "@git-viz/backend/GitLogService";
import * as path from "node:path";
import * as vscode from "vscode";
import { CommandHandler, postResponse } from "./types";

interface DiffOpenFilePayload {
  hash: string;
  path: string;
  oldPath?: string;
  status?: "A" | "M" | "D" | "R" | "C" | "T";
}

interface ExternalOpenUrlPayload {
  url: string;
}

function makeGitUri(repoRoot: string, filePath: string, ref: string): vscode.Uri {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  return vscode.Uri.from({
    scheme: "git",
    path: abs,
    query: JSON.stringify({ path: abs, ref }),
  });
}

const openFile: CommandHandler = {
  command: "diff:openFile",
  async handle(payload, cwd, webview, requestId) {
    const p = (payload ?? {}) as DiffOpenFilePayload;
    try {
      if (!p.hash || !p.path) throw new Error("hash and path required");
      const details = await GitLogService.getCommitDetails(cwd, p.hash);
      const parent = details?.hash
        ? // GitCommitDetails doesn't carry parents; resolve via getCommit
          await GitLogService.getCommit(cwd, p.hash)
        : null;
      const parentHash = parent?.parents?.[0];
      const leftPath = p.status === "R" && p.oldPath ? p.oldPath : p.path;
      const rightPath = p.path;
      const leftUri = parentHash
        ? makeGitUri(cwd, leftPath, parentHash)
        : vscode.Uri.from({ scheme: "untitled", path: leftPath });
      const rightUri = makeGitUri(cwd, rightPath, p.hash);
      const title = `${path.basename(rightPath)} (${p.hash.slice(0, 7)})`;
      await vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, title, {
        preview: true,
      });
      postResponse(webview, this.command, requestId, { data: { ok: true } });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

const openUrl: CommandHandler = {
  command: "external:openUrl",
  async handle(payload, _cwd, webview, requestId) {
    const p = (payload ?? {}) as ExternalOpenUrlPayload;
    try {
      if (!p.url) throw new Error("url required");
      await vscode.env.openExternal(vscode.Uri.parse(p.url));
      postResponse(webview, this.command, requestId, { data: { ok: true } });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

export const diffHandlers: CommandHandler[] = [openFile, openUrl];
