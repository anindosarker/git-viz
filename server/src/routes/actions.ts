import { GitActionService } from "@git-viz/backend/GitActionService";
import { Router, type Request, type Response, type RequestHandler } from "express";

function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

type Runner = (cwd: string, payload: any) => Promise<unknown>;

const ROUTES: Record<string, Runner> = {
  "branch/create": (cwd, p) => GitActionService.branchCreate(cwd, p),
  "branch/rename": (cwd, p) => GitActionService.branchRename(cwd, p),
  "branch/delete": (cwd, p) => GitActionService.branchDelete(cwd, p),
  "branch/set-upstream": (cwd, p) => GitActionService.branchSetUpstream(cwd, p),
  "checkout/ref": (cwd, p) => GitActionService.checkoutRef(cwd, p),
  merge: (cwd, p) => GitActionService.merge(cwd, p),
  "merge/abort": (cwd) => GitActionService.mergeAbort(cwd),
  rebase: (cwd, p) => GitActionService.rebase(cwd, p),
  "rebase/abort": (cwd) => GitActionService.rebaseAbort(cwd),
  "rebase/continue": (cwd) => GitActionService.rebaseContinue(cwd),
  "cherry-pick": (cwd, p) => GitActionService.cherryPick(cwd, p),
  revert: (cwd, p) => GitActionService.revert(cwd, p),
  reset: (cwd, p) => GitActionService.reset(cwd, p),
  "tag/create": (cwd, p) => GitActionService.tagCreate(cwd, p),
  "tag/delete": (cwd, p) => GitActionService.tagDelete(cwd, p),
  "tag/push": (cwd, p) => GitActionService.tagPush(cwd, p),
  "stash/create": (cwd, p) => GitActionService.stashCreate(cwd, p),
  "stash/apply": (cwd, p) => GitActionService.stashApply(cwd, p),
  "stash/pop": (cwd, p) => GitActionService.stashPop(cwd, p),
  "stash/drop": (cwd, p) => GitActionService.stashDrop(cwd, p),
  "stash/branch": (cwd, p) => GitActionService.stashBranch(cwd, p),
  "remote/fetch": (cwd, p) => GitActionService.remoteFetch(cwd, p),
  "remote/pull": (cwd, p) => GitActionService.remotePull(cwd, p),
  "remote/push": (cwd, p) => GitActionService.remotePush(cwd, p),
  "remote/add": (cwd, p) => GitActionService.remoteAdd(cwd, p),
  "remote/remove": (cwd, p) => GitActionService.remoteRemove(cwd, p),
  "remote/rename": (cwd, p) => GitActionService.remoteRename(cwd, p),
};

export function actionsRoutes(repoPath: string): Router {
  const r = Router();

  for (const [path, runner] of Object.entries(ROUTES)) {
    r.post(
      `/actions/${path}`,
      wrap(async (req, res) => {
        const data = await runner(repoPath, req.body ?? {});
        res.json(data);
      })
    );
  }

  return r;
}
