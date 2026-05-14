import { Router, type Request, type Response } from "express";
import type { RepoRegistry } from "../RepoRegistry";

/**
 * SSE endpoint multiplexing per-repo git state-changed events.
 *
 * Client connects to `/api/events?repoId=<abs-path>` and receives messages of
 * the form:
 *
 *   event: git:state-changed
 *   data: {"repoId":"/abs","kinds":["head","commits"]}
 *
 * If `repoId` is omitted, the default (first registered) repo is used. The
 * connection stays open and sends a 15s heartbeat comment so reverse proxies
 * don't close it.
 */
export function eventsRoutes(registry: RepoRegistry): Router {
  const r = Router();

  r.get("/events", (req: Request, res: Response) => {
    const repoIdParam = typeof req.query.repoId === "string" ? req.query.repoId : undefined;
    const entry = registry.get(repoIdParam);
    if (!entry) {
      res.status(404).json({ error: `Unknown repo: ${repoIdParam ?? "(none)"}` });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // Initial event so the client knows it's connected.
    res.write(`event: ready\ndata: ${JSON.stringify({ repoId: entry.id })}\n\n`);

    const unsubscribe = registry.subscribe(entry.id, (kinds) => {
      const payload = JSON.stringify({ repoId: entry.id, kinds });
      res.write(`event: git:state-changed\ndata: ${payload}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 15_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return r;
}
