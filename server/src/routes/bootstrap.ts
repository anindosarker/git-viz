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
      const orderRaw = typeof req.query.order === "string" ? req.query.order : undefined;
      const order: "topo" | "date" | undefined =
        orderRaw === "topo" || orderRaw === "date" ? orderRaw : undefined;
      const data = await GitBootstrapService.get(repoPath, limit, order);
      res.json(data);
    })
  );

  return r;
}
