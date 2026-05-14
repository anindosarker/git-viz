import type { GitWorktree } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

export class GitWorktreeService {
  /**
   * Lists worktrees of the given repo via `git worktree list --porcelain`.
   *
   * Porcelain records are blank-line separated and look like:
   *
   *   worktree /abs/path
   *   HEAD <hash>
   *   branch refs/heads/main
   *
   * Or for detached / bare / locked worktrees:
   *
   *   worktree /abs/path
   *   HEAD <hash>
   *   detached
   *
   *   worktree /abs/path
   *   bare
   *
   *   locked
   */
  public static async list(cwd: string): Promise<GitWorktree[]> {
    let raw: string;
    try {
      raw = await GitExecutor.exec(cwd, ["worktree", "list", "--porcelain"], {
        ignoreErrors: true,
      });
    } catch {
      return [];
    }
    if (!raw) {
      return [];
    }

    const out: GitWorktree[] = [];
    let current: Partial<GitWorktree> | undefined;

    const flush = () => {
      if (current && current.path) {
        out.push({
          path: current.path,
          head: current.head ?? "",
          branch: current.branch,
          bare: current.bare ?? false,
          detached: current.detached ?? false,
          locked: current.locked ?? false,
        });
      }
      current = undefined;
    };

    for (const line of raw.split("\n")) {
      if (line === "") {
        flush();
        continue;
      }
      const spaceIdx = line.indexOf(" ");
      const key = spaceIdx >= 0 ? line.slice(0, spaceIdx) : line;
      const value = spaceIdx >= 0 ? line.slice(spaceIdx + 1) : "";
      if (key === "worktree") {
        flush();
        current = { path: value };
      } else if (current) {
        if (key === "HEAD") {
          current.head = value;
        } else if (key === "branch") {
          current.branch = value.replace(/^refs\/heads\//, "");
        } else if (key === "bare") {
          current.bare = true;
        } else if (key === "detached") {
          current.detached = true;
        } else if (key === "locked") {
          current.locked = true;
        }
      }
    }
    flush();
    return out;
  }
}
