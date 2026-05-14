import { GitActionService } from "@git-viz/backend/GitActionService";
import * as vscode from "vscode";
import { CommandHandler, postResponse } from "./types";

type ActionRunner = (cwd: string, payload: any) => Promise<unknown>;

interface ActionDef {
  command: string;
  run: ActionRunner;
}

const ACTIONS: ActionDef[] = [
  { command: "actions:branch:create", run: (cwd, p) => GitActionService.branchCreate(cwd, p) },
  { command: "actions:branch:rename", run: (cwd, p) => GitActionService.branchRename(cwd, p) },
  { command: "actions:branch:delete", run: (cwd, p) => GitActionService.branchDelete(cwd, p) },
  {
    command: "actions:branch:setUpstream",
    run: (cwd, p) => GitActionService.branchSetUpstream(cwd, p),
  },
  { command: "actions:checkout:ref", run: (cwd, p) => GitActionService.checkoutRef(cwd, p) },
  { command: "actions:merge", run: (cwd, p) => GitActionService.merge(cwd, p) },
  { command: "actions:merge:abort", run: (cwd) => GitActionService.mergeAbort(cwd) },
  { command: "actions:rebase", run: (cwd, p) => GitActionService.rebase(cwd, p) },
  { command: "actions:rebase:abort", run: (cwd) => GitActionService.rebaseAbort(cwd) },
  { command: "actions:rebase:continue", run: (cwd) => GitActionService.rebaseContinue(cwd) },
  { command: "actions:cherryPick", run: (cwd, p) => GitActionService.cherryPick(cwd, p) },
  { command: "actions:revert", run: (cwd, p) => GitActionService.revert(cwd, p) },
  { command: "actions:reset", run: (cwd, p) => GitActionService.reset(cwd, p) },
  { command: "actions:tag:create", run: (cwd, p) => GitActionService.tagCreate(cwd, p) },
  { command: "actions:tag:delete", run: (cwd, p) => GitActionService.tagDelete(cwd, p) },
  { command: "actions:tag:push", run: (cwd, p) => GitActionService.tagPush(cwd, p) },
  { command: "actions:stash:create", run: (cwd, p) => GitActionService.stashCreate(cwd, p) },
  { command: "actions:stash:apply", run: (cwd, p) => GitActionService.stashApply(cwd, p) },
  { command: "actions:stash:pop", run: (cwd, p) => GitActionService.stashPop(cwd, p) },
  { command: "actions:stash:drop", run: (cwd, p) => GitActionService.stashDrop(cwd, p) },
  { command: "actions:stash:branch", run: (cwd, p) => GitActionService.stashBranch(cwd, p) },
  { command: "actions:remote:fetch", run: (cwd, p) => GitActionService.remoteFetch(cwd, p) },
  { command: "actions:remote:pull", run: (cwd, p) => GitActionService.remotePull(cwd, p) },
  { command: "actions:remote:push", run: (cwd, p) => GitActionService.remotePush(cwd, p) },
  { command: "actions:remote:add", run: (cwd, p) => GitActionService.remoteAdd(cwd, p) },
  { command: "actions:remote:remove", run: (cwd, p) => GitActionService.remoteRemove(cwd, p) },
  { command: "actions:remote:rename", run: (cwd, p) => GitActionService.remoteRename(cwd, p) },
];

export function makeActionHandlers(): CommandHandler[] {
  return ACTIONS.map<CommandHandler>(({ command, run }) => ({
    command,
    async handle(payload, cwd, webview, requestId) {
      try {
        const data = await run(cwd, payload ?? {});
        postResponse(webview, command, requestId, { data });
        // Emit state-change event so the webview refetches refs/commits/head.
        webview.postMessage({
          kind: "event",
          name: "git:state-changed",
          payload: { kinds: ["refs", "commits", "head"] },
        });
      } catch (err: any) {
        postResponse(webview, command, requestId, {
          error: err?.message ?? String(err),
        });
      }
    },
  }));
}

// Convenience helper for VS Code tree-view commands that pre-confirm via QuickPick.
export async function confirmAndRun(
  webview: vscode.Webview,
  command: string,
  runner: () => Promise<unknown>
): Promise<void> {
  try {
    await runner();
    webview.postMessage({
      kind: "event",
      name: "git:state-changed",
      payload: { kinds: ["refs", "commits", "head"] },
    });
  } catch (e: any) {
    vscode.window.showErrorMessage(`${command} failed: ${e?.message ?? String(e)}`);
  }
}
