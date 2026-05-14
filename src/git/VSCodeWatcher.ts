import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import { classifyChange, type ChangeKind, type IGitWatcher } from "@git-viz/backend/GitWatcher";

function resolveGitDir(cwd: string): string {
  const dotGit = path.join(cwd, ".git");
  try {
    const stat = fs.statSync(dotGit);
    if (stat.isDirectory()) return dotGit;
    if (stat.isFile()) {
      const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, "utf8"));
      if (m) return path.isAbsolute(m[1]) ? m[1] : path.resolve(cwd, m[1]);
    }
  } catch {
    // fall through
  }
  return dotGit;
}

interface VSCodeWatcherOptions {
  debounceMs?: number;
}

/**
 * VS Code-native file watcher for one repo. Mirrors GitWatcher's interface
 * but uses `vscode.workspace.createFileSystemWatcher` so it respects the
 * editor's existing file watcher pool (no extra inotify pressure).
 */
export class VSCodeWatcher implements IGitWatcher {
  private disposables: vscode.Disposable[] = [];
  private pendingKinds = new Set<ChangeKind>();
  private flushTimer: NodeJS.Timeout | undefined;
  private readonly debounceMs: number;
  private gitDir: string | undefined;

  constructor(
    private readonly cwd: string,
    private readonly onChange: (kinds: ChangeKind[]) => void,
    options: VSCodeWatcherOptions = {}
  ) {
    this.debounceMs = options.debounceMs ?? 200;
  }

  start(): void {
    this.gitDir = resolveGitDir(this.cwd);
    const gitDirUri = vscode.Uri.file(this.gitDir);
    const patterns = [
      new vscode.RelativePattern(gitDirUri, "HEAD"),
      new vscode.RelativePattern(gitDirUri, "ORIG_HEAD"),
      new vscode.RelativePattern(gitDirUri, "MERGE_HEAD"),
      new vscode.RelativePattern(gitDirUri, "FETCH_HEAD"),
      new vscode.RelativePattern(gitDirUri, "packed-refs"),
      new vscode.RelativePattern(gitDirUri, "index"),
      new vscode.RelativePattern(gitDirUri, "refs/**"),
      new vscode.RelativePattern(gitDirUri, "logs/**"),
      // Working-tree edits — we only need a dirty signal, not per-file
      new vscode.RelativePattern(this.cwd, "**/*"),
    ];

    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      const handler = (uri: vscode.Uri) => this.handle(uri.fsPath);
      this.disposables.push(
        watcher,
        watcher.onDidCreate(handler),
        watcher.onDidChange(handler),
        watcher.onDidDelete(handler)
      );
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.pendingKinds.clear();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  private handle(filePath: string): void {
    const kinds = classifyChange(filePath, this.cwd, this.gitDir);
    if (kinds.length === 0) return;
    for (const k of kinds) this.pendingKinds.add(k);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      const kinds = Array.from(this.pendingKinds);
      this.pendingKinds.clear();
      this.flushTimer = undefined;
      if (kinds.length > 0) this.onChange(kinds);
    }, this.debounceMs);
  }
}

/**
 * Factory: returns a VS Code-native watcher when running inside the extension,
 * otherwise falls back to the chokidar-based GitWatcher. Use this so callers
 * don't need to know which environment they're in.
 */
export async function makeWatcher(
  cwd: string,
  onChange: (kinds: ChangeKind[]) => void
): Promise<IGitWatcher> {
  // Guard for path.isAbsolute on `cwd` so the function is safe to call from
  // tests that don't pass real paths.
  if (!path.isAbsolute(cwd)) {
    throw new Error(`makeWatcher: cwd must be absolute (got ${cwd})`);
  }
  try {
    // If vscode is available at runtime, use the editor watcher.
    if (vscode.workspace && typeof vscode.workspace.createFileSystemWatcher === "function") {
      return new VSCodeWatcher(cwd, onChange);
    }
  } catch {
    // fallthrough
  }
  const { GitWatcher } = await import("@git-viz/backend/GitWatcher");
  return new GitWatcher(cwd, onChange);
}
