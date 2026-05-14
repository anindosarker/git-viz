import fs from "fs";
import path from "path";
import type { FSWatcher } from "chokidar";

export type ChangeKind = "head" | "refs" | "commits" | "workingTree" | "stashes";

export interface IGitWatcher {
  start(): void | Promise<void>;
  stop(): Promise<void>;
}

/**
 * Maps a changed file path to one or more ChangeKinds.
 * Path can be absolute or relative to cwd. Empty result means "ignore".
 *
 * `gitDir` (optional) lets callers in linked worktrees pass the resolved
 * git directory (e.g. `/repo/.git/worktrees/foo`) so events under that
 * directory get classified the same as `<cwd>/.git/...`.
 */
export function classifyChange(filePath: string, cwd: string, gitDir?: string): ChangeKind[] {
  // Normalize and compute a posix-style path relative to cwd so the rules below
  // work on both unix and windows.
  const abs = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);

  // If the change is inside the resolved gitDir (linked worktree case),
  // classify it relative to that.
  if (gitDir) {
    const relGit = path.relative(gitDir, abs).split(path.sep).join("/");
    if (relGit !== "" && !relGit.startsWith("..")) {
      return classifyGitInner(relGit);
    }
  }

  const rel = path.relative(cwd, abs).split(path.sep).join("/");

  if (rel === "" || rel.startsWith("..")) {
    return [];
  }

  // Inside .git
  if (rel === ".git" || rel.startsWith(".git/")) {
    const inner = rel === ".git" ? "" : rel.slice(".git/".length);
    return classifyGitInner(inner);
  }

  // Anything else inside the working tree → working tree change
  return ["workingTree"];
}

function classifyGitInner(inner: string): ChangeKind[] {
  // Things we always ignore
  if (inner === "" || inner === "index.lock") {
    return [];
  }
  if (inner.endsWith(".lock")) {
    return [];
  }
  if (inner.startsWith("objects/")) {
    return [];
  }

  if (inner === "HEAD") {
    return ["head"];
  }
  if (inner === "ORIG_HEAD" || inner === "MERGE_HEAD" || inner === "FETCH_HEAD") {
    return ["head"];
  }
  if (inner === "packed-refs") {
    return ["refs", "commits"];
  }
  if (inner === "index") {
    return ["workingTree"];
  }

  if (inner.startsWith("refs/stash") || inner === "refs/stash") {
    return ["stashes"];
  }
  if (inner.startsWith("logs/refs/stash")) {
    return ["stashes"];
  }

  if (inner.startsWith("refs/")) {
    return ["refs", "commits"];
  }
  if (inner.startsWith("logs/")) {
    // logs/HEAD or logs/refs/...
    if (inner === "logs/HEAD") {
      return ["head", "commits"];
    }
    return ["refs"];
  }

  return [];
}

interface GitWatcherOptions {
  /** Debounce window in ms (default 200). */
  debounceMs?: number;
  /** Additional ignore globs. */
  extraIgnored?: string[];
  /** Use polling (default false; chokidar's awaitWriteFinish handles most cases). */
  usePolling?: boolean;
}

/**
 * Chokidar-based file watcher for a single git repository. Emits coalesced
 * ChangeKind sets via the onChange callback.
 */
export class GitWatcher implements IGitWatcher {
  private watcher: FSWatcher | undefined;
  private resolvedGitDir: string | undefined;
  private readonly debounceMs: number;
  private readonly extraIgnored: string[];
  private readonly usePolling: boolean;
  private pendingKinds = new Set<ChangeKind>();
  private flushTimer: NodeJS.Timeout | undefined;

  constructor(
    private readonly cwd: string,
    private readonly onChange: (kinds: ChangeKind[]) => void,
    options: GitWatcherOptions = {}
  ) {
    this.debounceMs = options.debounceMs ?? 200;
    this.extraIgnored = options.extraIgnored ?? [];
    this.usePolling = options.usePolling ?? false;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      return;
    }
    // Require chokidar lazily so unit tests for classifyChange don't need the dep at import time.

    const chokidar = require("chokidar") as typeof import("chokidar");

    const gitDir = resolveGitDir(this.cwd);
    this.resolvedGitDir = gitDir;
    const targets = [
      path.join(gitDir, "HEAD"),
      path.join(gitDir, "ORIG_HEAD"),
      path.join(gitDir, "MERGE_HEAD"),
      path.join(gitDir, "FETCH_HEAD"),
      path.join(gitDir, "packed-refs"),
      path.join(gitDir, "index"),
      path.join(gitDir, "refs"),
      path.join(gitDir, "logs"),
      this.cwd,
    ];

    const ignored: (string | RegExp)[] = [
      path.join(gitDir, "objects"),
      path.join(gitDir, "index.lock"),
      /(^|[/\\])node_modules([/\\]|$)/,
      /(^|[/\\])dist([/\\]|$)/,
      /(^|[/\\])\.next([/\\]|$)/,
      /\.lock$/,
      ...this.extraIgnored,
    ];

    this.watcher = chokidar.watch(targets, {
      ignored,
      ignoreInitial: true,
      persistent: true,
      usePolling: this.usePolling,
      awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
      depth: 99,
    });

    this.watcher.on("all", (_event: string, filePath: string) => {
      const kinds = classifyChange(filePath, this.cwd, this.resolvedGitDir);
      for (const k of kinds) {
        this.pendingKinds.add(k);
      }
      if (this.pendingKinds.size > 0) {
        this.scheduleFlush();
      }
    });

    this.watcher.on("error", (err: unknown) => {
      // Linux inotify limits or perms — log and continue. Caller can fall back
      // to manual refresh.
      console.warn(`[GitWatcher] error watching ${this.cwd}:`, err);
    });

    await new Promise<void>((resolve) => {
      if (!this.watcher) {
        return resolve();
      }
      this.watcher.once("ready", () => resolve());
    });
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.pendingKinds.clear();
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      const kinds = Array.from(this.pendingKinds);
      this.pendingKinds.clear();
      this.flushTimer = undefined;
      if (kinds.length > 0) {
        this.onChange(kinds);
      }
    }, this.debounceMs);
  }
}

/**
 * Resolves the actual git directory for `cwd`. In a linked worktree, the
 * top-level `.git` is a file containing `gitdir: <path>`; otherwise it's a
 * directory. Returns the absolute path.
 */
function resolveGitDir(cwd: string): string {
  const dotGit = path.join(cwd, ".git");
  try {
    const stat = fs.statSync(dotGit);
    if (stat.isDirectory()) {
      return dotGit;
    }
    if (stat.isFile()) {
      const contents = fs.readFileSync(dotGit, "utf8").trim();
      const m = /^gitdir:\s*(.+)$/m.exec(contents);
      if (m) {
        const resolved = path.isAbsolute(m[1]) ? m[1] : path.resolve(cwd, m[1]);
        return resolved;
      }
    }
  } catch {
    // fall through
  }
  return dotGit;
}
