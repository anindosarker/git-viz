import { Router } from "express";
import { GitLogService } from "@git-viz/backend/GitLogService";
import type { CommitFilter } from "@git-viz/shared";
import type { RepoRegistry } from "../RepoRegistry";
import { repoPathFor, wrap } from "./_helpers";

export function commitsRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.post(
    "/commits/page",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const body = (req.body ?? {}) as {
        cursor?: string;
        limit?: number;
        order?: "topo" | "date";
        filter?: CommitFilter;
      };
      const data = await GitLogService.getCommitsPage(
        repoPath,
        body.cursor,
        body.limit,
        body.order,
        body.filter
      );
      res.json(data);
    })
  );

  r.get(
    "/commits/details/:hash",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const data = await GitLogService.getCommitDetails(repoPath, String(req.params.hash));
      res.json(data);
    })
  );

  r.get(
    "/commits/file-changes/:hash",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const data = await GitLogService.getFileChanges(repoPath, String(req.params.hash));
      res.json(data);
    })
  );

  r.get(
    "/commits/file-diff/:hash",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const filePath = req.query.path;
      if (typeof filePath !== "string" || !filePath) {
        res.status(400).json({ error: "path query param is required" });
        return;
      }
      const data = await GitLogService.getFileDiff(repoPath, String(req.params.hash), filePath);
      res.json(data);
    })
  );

  r.get(
    "/commits/patch/:hash",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const patch = await GitLogService.getPatch(repoPath, String(req.params.hash));
      res.type("text/plain").send(patch);
    })
  );

  r.get(
    "/commits/:hash",
    wrap(async (req, res) => {
      const repoPath = repoPathFor(req, registry);
      const data = await GitLogService.getCommit(repoPath, String(req.params.hash));
      if (!data) {
        res.status(404).json({ error: "commit not found" });
        return;
      }
      res.json(data);
    })
  );

  return r;
}
