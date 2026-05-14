import * as vscode from "vscode";
import path from "path";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import { GitSubmoduleService } from "@git-viz/backend/GitSubmoduleService";
import { GitWorktreeService } from "@git-viz/backend/GitWorktreeService";
import type { RepoSummary } from "@git-viz/shared";
import { CommandHandler, postResponse } from "./types";

const listRepos: CommandHandler = {
  command: "repos:list",
  async handle(_payload, _cwd, webview, requestId) {
    try {
      const folders = vscode.workspace.workspaceFolders ?? [];
      const out: RepoSummary[] = [];
      for (const folder of folders) {
        const root = await GitRepoService.getRepoRoot(folder.uri.fsPath);
        if (!root) continue;
        try {
          const info = await GitRepoService.getRepoInfo(root);
          out.push({
            id: root,
            name: info.name || path.basename(root),
            path: root,
            hasUncommittedChanges: info.hasUncommittedChanges,
            currentBranch: info.head.branch,
          });
        } catch {
          out.push({
            id: root,
            name: path.basename(root),
            path: root,
            hasUncommittedChanges: false,
          });
        }
      }
      postResponse(webview, this.command, requestId, { data: out });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

const listSubmodules: CommandHandler = {
  command: "submodules:list",
  async handle(_payload, cwd, webview, requestId) {
    try {
      const data = await GitSubmoduleService.list(cwd);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

const listWorktrees: CommandHandler = {
  command: "worktrees:list",
  async handle(_payload, cwd, webview, requestId) {
    try {
      const data = await GitWorktreeService.list(cwd);
      postResponse(webview, this.command, requestId, { data });
    } catch (err: any) {
      postResponse(webview, this.command, requestId, {
        error: err?.message ?? String(err),
      });
    }
  },
};

export const multiRepoHandlers: CommandHandler[] = [listRepos, listSubmodules, listWorktrees];
