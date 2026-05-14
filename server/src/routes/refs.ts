import { Router, type Request, type Response, type RequestHandler } from "express";
import { GitRefService } from "@git-viz/backend/GitRefService";

function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

export function refsRoutes(repoPath: string): Router {
  const r = Router();

  r.get(
    "/refs",
    wrap(async (req, res) => {
      const includeRemote = req.query.includeRemote === "true";
      const data = await GitRefService.getAll(repoPath, includeRemote);
      res.json(data);
    })
  );

  return r;
}
