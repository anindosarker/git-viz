import { Command } from "commander";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";

import { bootstrapRoutes } from "./routes/bootstrap";
import { commitsRoutes } from "./routes/commits";
import { refsRoutes } from "./routes/refs";
import { remotesRoutes } from "./routes/remotes";
import { repoRoutes } from "./routes/repo";

interface ServerOptions {
  repo: string;
  port: number;
  bind: string;
}

function parseOptions(argv: string[]): ServerOptions {
  const program = new Command();
  program
    .name("git-viz-server")
    .option("-r, --repo <path>", "Repository path", process.cwd())
    .option("-p, --port <n>", "Port to listen on", "3000")
    .option("-b, --bind <addr>", "Bind address", "127.0.0.1")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .parse(argv, { from: "user" });
  const opts = program.opts<{ repo: string; port: string; bind: string }>();
  return {
    repo: path.resolve(opts.repo),
    port: Number(opts.port),
    bind: opts.bind,
  };
}

export function start(argv: string[] = process.argv.slice(2)): void {
  const { repo, port, bind } = parseOptions(argv);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", repoRoutes(repo));
  app.use("/api", bootstrapRoutes(repo));
  app.use("/api", commitsRoutes(repo));
  app.use("/api", refsRoutes(repo));
  app.use("/api", remotesRoutes(repo));

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
    console.log(`git-viz server: http://${bind}:${port}  (repo: ${repo})`);
  });
}

if (require.main === module) {
  start();
}
