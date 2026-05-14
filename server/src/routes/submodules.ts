import { Router } from "express";
import { GitSubmoduleService } from "@git-viz/backend/GitSubmoduleService";
import { GitWorktreeService } from "@git-viz/backend/GitWorktreeService";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function submodulesRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.get(
    "/submodules",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      res.json(await GitSubmoduleService.list(repoPath));
    })
  );

  r.get(
    "/worktrees",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      res.json(await GitWorktreeService.list(repoPath));
    })
  );

  return r;
}
