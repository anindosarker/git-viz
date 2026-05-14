import type { Request, RequestHandler, Response } from "express";
import type { RepoRegistry } from "../RepoRegistry";

export function wrap(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Resolves the active repo path for this request. Accepts:
 *   - ?repoId=<abs path>
 *   - X-Repo-Id header
 *   - default: first registered repo
 */
export function repoPathFor(req: Request, registry: RepoRegistry): string {
  const fromQuery = typeof req.query.repoId === "string" ? req.query.repoId : undefined;
  const fromHeader =
    typeof req.headers["x-repo-id"] === "string" ? (req.headers["x-repo-id"] as string) : undefined;
  return registry.resolvePath(fromQuery ?? fromHeader);
}
