import { Router } from "express";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function repoRoutes(registry: RepoRegistry): Router {
  const r = Router();

  const handler = wrap(async (req, res) => {
    const repoPath = repoPathFor(req, registry);
    const info = await GitRepoService.getRepoInfo(repoPath);
    res.json(info);
  });

  r.get("/repo", handler);
  r.get("/repo-info", handler);

  r.get(
    "/repos",
    wrap(async (_req, res) => {
      res.json(await registry.listSummaries());
    })
  );

  return r;
}
