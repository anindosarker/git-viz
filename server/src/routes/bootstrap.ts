import { Router } from "express";
import { GitBootstrapService } from "@git-viz/backend/GitBootstrapService";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function bootstrapRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.get(
    "/bootstrap",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await GitBootstrapService.get(repoPath, limit);
      res.json(data);
    })
  );

  return r;
}
