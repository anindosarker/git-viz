import path from "path";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import { GitWatcher, type ChangeKind } from "@git-viz/backend/GitWatcher";
import type { RepoSummary } from "@git-viz/shared";

export interface RepoEntry {
  id: string;
  path: string;
  name: string;
  watcher?: GitWatcher;
}

/**
 * Tracks all repos served by this server and routes file watcher events to
 * subscribers (SSE clients). Repo IDs are absolute paths so they're stable
 * across reloads.
 */
export class RepoRegistry {
  private readonly repos = new Map<string, RepoEntry>();
  private readonly subscribers = new Map<string, Set<(kinds: ChangeKind[]) => void>>();

  constructor(repoPaths: string[]) {
    for (const p of repoPaths) {
      this.addRepo(p);
    }
  }

  private addRepo(rawPath: string): void {
    const abs = path.resolve(rawPath);
    if (this.repos.has(abs)) {
      return;
    }
    const entry: RepoEntry = {
      id: abs,
      path: abs,
      name: path.basename(abs),
    };
    this.repos.set(abs, entry);
  }

  list(): RepoEntry[] {
    return Array.from(this.repos.values());
  }

  get(id?: string): RepoEntry | undefined {
    if (id) {
      return this.repos.get(path.resolve(id));
    }
    // Default: first registered repo
    return this.repos.values().next().value;
  }

  /** Resolves a repo's path from a request — query param `repoId` or first repo. */
  resolvePath(repoId?: string): string {
    const entry = this.get(repoId);
    if (!entry) {
      throw new Error(`Unknown repo: ${repoId ?? "(none registered)"}`);
    }
    return entry.path;
  }

  async listSummaries(): Promise<RepoSummary[]> {
    const out: RepoSummary[] = [];
    for (const entry of this.repos.values()) {
      try {
        const info = await GitRepoService.getRepoInfo(entry.path);
        out.push({
          id: entry.id,
          name: info.name || entry.name,
          path: entry.path,
          hasUncommittedChanges: info.hasUncommittedChanges,
          currentBranch: info.head.branch,
        });
      } catch {
        out.push({
          id: entry.id,
          name: entry.name,
          path: entry.path,
          hasUncommittedChanges: false,
        });
      }
    }
    return out;
  }

  /**
   * Starts file watchers for all repos. Idempotent. Each watcher fans out to
   * its subscribers.
   */
  async startWatchers(): Promise<void> {
    for (const entry of this.repos.values()) {
      if (entry.watcher) {
        continue;
      }
      const watcher = new GitWatcher(entry.path, (kinds) => this.emit(entry.id, kinds));
      try {
        await watcher.start();
        entry.watcher = watcher;
      } catch (err) {
        console.warn(`[RepoRegistry] failed to start watcher for ${entry.path}:`, err);
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const entry of this.repos.values()) {
      if (entry.watcher) {
        await entry.watcher.stop();
        entry.watcher = undefined;
      }
    }
  }

  subscribe(repoId: string, handler: (kinds: ChangeKind[]) => void): () => void {
    let set = this.subscribers.get(repoId);
    if (!set) {
      set = new Set();
      this.subscribers.set(repoId, set);
    }
    set.add(handler);
    return () => {
      const s = this.subscribers.get(repoId);
      if (s) {
        s.delete(handler);
        if (s.size === 0) {
          this.subscribers.delete(repoId);
        }
      }
    };
  }

  private emit(repoId: string, kinds: ChangeKind[]): void {
    const subs = this.subscribers.get(repoId);
    if (!subs) {
      return;
    }
    for (const fn of subs) {
      try {
        fn(kinds);
      } catch (err) {
        console.warn(`[RepoRegistry] subscriber threw:`, err);
      }
    }
  }
}
