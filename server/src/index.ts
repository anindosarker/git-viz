import { Command } from "commander";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";

import { RepoRegistry } from "./RepoRegistry";
import { generateToken, makeAuthMiddleware } from "./auth";
import { bootstrapRoutes } from "./routes/bootstrap";
import { commitsRoutes } from "./routes/commits";
import { eventsRoutes } from "./routes/events";
import { refsRoutes } from "./routes/refs";
import { remotesRoutes } from "./routes/remotes";
import { repoRoutes } from "./routes/repo";
import { submodulesRoutes } from "./routes/submodules";

interface ServerOptions {
  repos: string[];
  port: number;
  bind: string;
  token: string | undefined;
  noAuth: boolean;
  fixture: string | undefined;
  open: boolean;
}

function parseOptions(argv: string[]): ServerOptions {
  const program = new Command();
  program
    .name("git-viz-server")
    .description("git-viz standalone server")
    .option(
      "-r, --repo <path>",
      "Repository path (repeatable)",
      (value: string, prev: string[]) => [...prev, value],
      [] as string[]
    )
    .option("-p, --port <n>", "Port to listen on", "3000")
    .option("-b, --bind <addr>", "Bind address", "127.0.0.1")
    .option("--token <secret>", "Auth token (auto-generated if omitted)")
    .option("--no-auth", "Disable auth (only allowed when binding 127.0.0.1)")
    .option("--fixture <name>", "Load fixture DAG instead of a real repo")
    .option("--open", "Open browser after start")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .parse(argv, { from: "user" });
  const opts = program.opts<{
    repo: string[];
    port: string;
    bind: string;
    token?: string;
    auth: boolean;
    fixture?: string;
    open?: boolean;
  }>();
  const repos = opts.repo.length > 0 ? opts.repo : [process.cwd()];
  return {
    repos: repos.map((p) => path.resolve(p)),
    port: Number(opts.port),
    bind: opts.bind,
    token: opts.token,
    noAuth: opts.auth === false,
    fixture: opts.fixture,
    open: opts.open === true,
  };
}

export function start(argv: string[] = process.argv.slice(2)): void {
  const options = parseOptions(argv);
  const { repos, port, bind, fixture, open } = options;

  if (options.noAuth && bind !== "127.0.0.1" && bind !== "localhost") {
    console.error(`Refusing to start: --no-auth requires --bind 127.0.0.1 (got ${bind}).`);
    process.exit(1);
  }

  const token = options.noAuth ? null : (options.token ?? generateToken());

  const registry = new RepoRegistry(repos);
  void registry.startWatchers();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Auth gate for /api/* — webview assets remain public so the SPA loads first.
  if (token !== null) {
    app.use("/api", makeAuthMiddleware(token));
  }

  app.use("/api", repoRoutes(registry));
  app.use("/api", bootstrapRoutes(registry));
  app.use("/api", commitsRoutes(registry));
  app.use("/api", refsRoutes(registry));
  app.use("/api", remotesRoutes(registry));
  app.use("/api", submodulesRoutes(registry));
  app.use("/api", eventsRoutes(registry));

  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    res.status(500).json({ error: message });
  });

  app.listen(port, bind, () => {
    const repoList = repos.map((r) => `  - ${r}`).join("\n");
    const tokenLine = token
      ? `Auth token: ${token}\nOpen: http://${bind}:${port}/#token=${token}`
      : "Auth disabled (--no-auth).";
    console.log(
      `git-viz server: http://${bind}:${port}\n` +
        `Repos:\n${repoList}\n` +
        (fixture ? `Fixture: ${fixture}\n` : "") +
        tokenLine
    );

    if (open) {
      const url = token ? `http://${bind}:${port}/#token=${token}` : `http://${bind}:${port}`;
      openBrowser(url);
    }
  });

  const shutdown = async () => {
    await registry.stopAll();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open ${JSON.stringify(url)}`
      : process.platform === "win32"
        ? `start "" ${JSON.stringify(url)}`
        : `xdg-open ${JSON.stringify(url)}`;

  const { exec } = require("child_process") as typeof import("child_process");
  exec(cmd, () => {
    // best-effort; ignore errors
  });
}

if (require.main === module) {
  start();
}
