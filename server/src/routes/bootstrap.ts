import { Router, type Request, type Response, type RequestHandler } from "express";
import { GitBootstrapService } from "@git-viz/backend/GitBootstrapService";

function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

export function bootstrapRoutes(repoPath: string): Router {
  const r = Router();

  r.get(
    "/bootstrap",
    wrap(async (req, res) => {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const orderRaw = typeof req.query.order === "string" ? req.query.order : undefined;
      const order: "topo" | "date" | undefined =
        orderRaw === "topo" || orderRaw === "date" ? orderRaw : undefined;
      const data = await GitBootstrapService.get(repoPath, limit, order);
      res.json(data);
    })
  );

  return r;
}
