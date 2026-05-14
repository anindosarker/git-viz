import { Router } from "express";
import { GitRefService } from "@git-viz/backend/GitRefService";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function refsRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.get(
    "/refs",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const includeRemote = req.query.includeRemote === "true";
      const data = await GitRefService.getAll(repoPath, includeRemote);
      res.json(data);
    })
  );

  return r;
}
