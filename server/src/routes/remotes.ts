import { Router } from "express";
import { GitRemoteService } from "@git-viz/backend/GitRemoteService";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function remotesRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.get(
    "/remotes",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const data = await GitRemoteService.list(repoPath);
      res.json(data);
    })
  );

  return r;
}
