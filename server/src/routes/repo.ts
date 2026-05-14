import { Router, type Request, type Response, type RequestHandler } from "express";
import { GitRepoService } from "@git-viz/backend/GitRepoService";

function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

export function repoRoutes(repoPath: string): Router {
  const r = Router();

  const handler = wrap(async (_req, res) => {
    const info = await GitRepoService.getRepoInfo(repoPath);
    res.json(info);
  });

  r.get("/repo", handler);
  r.get("/repo-info", handler);

  return r;
}
