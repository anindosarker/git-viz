import { Router, type Request, type Response, type RequestHandler } from "express";
import { GitRemoteService } from "@git-viz/backend/GitRemoteService";

function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

export function remotesRoutes(repoPath: string): Router {
  const r = Router();

  r.get(
    "/remotes",
    wrap(async (_req, res) => {
      const data = await GitRemoteService.list(repoPath);
      res.json(data);
    })
  );

  return r;
}
