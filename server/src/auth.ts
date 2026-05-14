import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

/** Generates a random URL-safe token. */
export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Bearer token middleware. Skips OPTIONS preflight. Recognizes:
 *   - `Authorization: Bearer <token>`
 *   - `?token=<token>` query param (needed for EventSource which can't set headers)
 *
 * The HTML shell + JS bundle is served without auth so the client can fetch
 * them and then attach the token to API requests.
 */
export function makeAuthMiddleware(token: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      return next();
    }
    const header = req.headers.authorization;
    let provided: string | undefined;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      provided = header.slice("Bearer ".length).trim();
    } else if (typeof req.query.token === "string") {
      provided = req.query.token;
    }
    if (!provided || !timingSafeEqualStr(provided, token)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}
