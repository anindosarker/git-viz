import type {
  CommitFilter,
  DiffHunk,
  GitCommitDetails,
  GitCommitSummary,
  GitFileChange,
} from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";
import {
  COMMIT_FORMAT,
  mergeFileChanges,
  parseCommitStream,
  parseNameStatusZ,
  parseNumstatZ,
  parseShortStat,
  parseUnifiedDiff,
} from "./parsers";

const MAX_FILES_PER_COMMIT = 500;

export interface GetCommitsPageResult {
  commits: GitCommitSummary[];
  nextCursor?: string;
  hasMore: boolean;
}

export class GitLogService {
  public static async getCommitsPage(
    cwd: string,
    cursor?: string,
    limit: number = 500,
    order: "topo" | "date" = "date",
    filter?: CommitFilter
  ): Promise<GetCommitsPageResult> {
    const args: string[] = ["log", "-z", `--format=${COMMIT_FORMAT}%x00`];
    args.push(order === "topo" ? "--topo-order" : "--date-order");
    // Fetch one extra commit to determine hasMore without a second call.
    args.push(`--max-count=${limit + 1}`);

    const { revs, paths } = GitLogService.buildFilterArgs(filter);
    for (const a of GitLogService.buildFilterFlags(filter)) {
      args.push(a);
    }

    if (revs.length === 0) {
      if (cursor) {
        // Start strictly after the cursor commit.
        args.push(`${cursor}~1`);
      } else if (!filter?.refs || filter.refs.length === 0) {
        args.push("--all");
      }
    } else {
      // Filter-supplied refs anchor traversal. Combine with cursor by limiting
      // to ancestors of cursor's parent: pass `<cursor>~1` AND the refs.
      if (cursor) {
        revs.push(`${cursor}~1`);
      }
      for (const r of revs) {
        args.push(r);
      }
    }

    if (paths.length > 0) {
      args.push("--");
      for (const p of paths) {
        args.push(p);
      }
    }

    const buf = await GitExecutor.execBuffer(cwd, args);
    const all = parseCommitStream(buf);
    const hasMore = all.length > limit;
    const commits = hasMore ? all.slice(0, limit) : all;
    const nextCursor = hasMore && commits.length > 0 ? commits[commits.length - 1].hash : undefined;
    return { commits, nextCursor, hasMore };
  }

  public static async getCommit(cwd: string, hash: string): Promise<GitCommitSummary | null> {
    try {
      const buf = await GitExecutor.execBuffer(cwd, [
        "log",
        "-z",
        `--format=${COMMIT_FORMAT}%x00`,
        "--max-count=1",
        hash,
      ]);
      const commits = parseCommitStream(buf);
      return commits[0] ?? null;
    } catch {
      return null;
    }
  }

  public static async getCommitDetails(cwd: string, hash: string): Promise<GitCommitDetails> {
    // %B = body (incl. subject), %G? = signature status code, %GS = signer.
    // Separate each with NUL so newlines inside the body don't confuse us.
    const showOut = await GitExecutor.execBuffer(cwd, [
      "show",
      "-s",
      "--format=%B%x00%G?%x00%GS",
      hash,
    ]);
    const text = showOut.toString("utf8");
    const parts = text.split("\0");
    const body = (parts[0] ?? "").replace(/\s+$/, "");
    const sigCode = (parts[1] ?? "").trim();
    const signer = (parts[2] ?? "").trim();

    const shortstatRaw = await GitExecutor.exec(cwd, ["show", "--shortstat", "--format=", hash]);
    const stats = parseShortStat(shortstatRaw);

    return {
      hash,
      body,
      signature: {
        status: GitLogService.mapSignatureStatus(sigCode),
        signer: signer || undefined,
      },
      stats,
    };
  }

  public static async getFileChanges(
    cwd: string,
    hash: string
  ): Promise<{ files: GitFileChange[]; truncated: boolean }> {
    // `--name-status` / `--numstat` already suppress the patch body.
    // (Using `-s` / `--no-patch` here conflicts with these flags.)
    const [nameStatusBuf, numstatBuf] = await Promise.all([
      GitExecutor.execBuffer(cwd, ["show", "--format=", "-z", "--name-status", hash]),
      GitExecutor.execBuffer(cwd, ["show", "--format=", "-z", "--numstat", hash]),
    ]);

    const nameStatus = parseNameStatusZ(nameStatusBuf);
    const numstat = parseNumstatZ(numstatBuf);
    const all = mergeFileChanges(nameStatus, numstat);
    const truncated = all.length > MAX_FILES_PER_COMMIT;
    const files = truncated ? all.slice(0, MAX_FILES_PER_COMMIT) : all;
    return { files, truncated };
  }

  public static async getFileDiff(
    cwd: string,
    hash: string,
    path: string
  ): Promise<{ hunks: DiffHunk[] }> {
    // `git show <hash> -- <path>` handles both root commits (no parent) and
    // regular commits, and emits unified diff with a textconv-aware default.
    const raw = await GitExecutor.exec(cwd, ["show", "--format=", "--no-color", hash, "--", path]);
    if (!raw) {
      return { hunks: [] };
    }
    // Binary files: git emits "Binary files a/x and b/x differ" instead of hunks.
    if (/^Binary files .* differ$/m.test(raw) && !/^@@/m.test(raw)) {
      return {
        hunks: [
          {
            oldStart: 0,
            oldLines: 0,
            newStart: 0,
            newLines: 0,
            header: "binary",
            lines: [],
          },
        ],
      };
    }
    return { hunks: parseUnifiedDiff(raw) };
  }

  public static async getPatch(cwd: string, hash: string): Promise<string> {
    return GitExecutor.exec(cwd, ["format-patch", "-1", "--stdout", hash]);
  }

  // ---- internal helpers ----

  private static buildFilterFlags(filter?: CommitFilter): string[] {
    if (!filter) {
      return [];
    }
    const out: string[] = [];
    if (filter.query) {
      out.push(`--grep=${filter.query}`);
      if (filter.queryRegex) {
        out.push("--extended-regexp");
      } else {
        out.push("--regexp-ignore-case", "--fixed-strings");
      }
    }
    if (filter.author) {
      out.push(`--author=${filter.author}`);
    }
    if (filter.since) {
      out.push(`--since=${filter.since}`);
    }
    if (filter.until) {
      out.push(`--until=${filter.until}`);
    }
    return out;
  }

  private static buildFilterArgs(filter?: CommitFilter): {
    revs: string[];
    paths: string[];
  } {
    const revs: string[] = [];
    const paths: string[] = filter?.paths ? [...filter.paths] : [];
    if (filter?.hash) {
      revs.push(filter.hash);
    } else if (filter?.refs && filter.refs.length > 0) {
      revs.push(...filter.refs);
    }
    return { revs, paths };
  }

  private static mapSignatureStatus(code: string): GitCommitDetails["signature"]["status"] {
    switch (code) {
      case "G":
        return "good";
      case "B":
        return "bad";
      case "U":
      case "X":
      case "Y":
      case "R":
      case "E":
        return "untrusted";
      default:
        return "none";
    }
  }
}
