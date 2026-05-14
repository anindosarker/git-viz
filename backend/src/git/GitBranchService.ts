import { GitBranch } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

const FIELD_SEP = "\x00";

export class GitBranchService {
  /**
   * Lists local + (optionally) remote branches with upstream tracking info.
   */
  public static async list(
    cwd: string,
    includeRemote: boolean = true
  ): Promise<GitBranch[]> {
    const refspecs = includeRemote
      ? ["refs/heads", "refs/remotes"]
      : ["refs/heads"];

    // Record terminator: newline (default). Field separator: NUL via %00.
    // Refs cannot contain newlines, so plain line splitting is safe.
    // We include the full `refname` so we can reliably classify local vs
    // remote-tracking — short names alone are ambiguous for branches like
    // "antigravity/menu" (a local branch containing a slash).
    const format =
      "%(refname)%00%(refname:short)%00%(objectname)%00%(HEAD)%00%(upstream:short)%00%(committerdate:iso-strict)";

    const buf = await GitExecutor.execBuffer(cwd, [
      "for-each-ref",
      `--format=${format}`,
      ...refspecs,
    ]);

    const raw = buf.toString("utf8");
    if (!raw.trim()) {return [];}

    const branches: GitBranch[] = [];

    for (const line of raw.split("\n")) {
      if (!line) {continue;}
      const [fullRef, name, tip, headMark, upstream, date] =
        line.split(FIELD_SEP);
      if (!fullRef || !name || !tip) {continue;}

      // Skip the symbolic remote HEAD pointer (e.g. "origin/HEAD" -> "origin/main").
      if (fullRef.endsWith("/HEAD")) {continue;}

      const isRemote = fullRef.startsWith("refs/remotes/");

      const branch: GitBranch = {
        name,
        tip,
        isHead: headMark === "*",
        isRemote,
        lastCommitDate: date ?? "",
      };

      if (upstream) {
        branch.upstream = upstream;
        const counts = await GitBranchService.aheadBehind(cwd, name, upstream);
        if (counts) {
          branch.ahead = counts.ahead;
          branch.behind = counts.behind;
        }
      }

      branches.push(branch);
    }

    return branches;
  }

  private static async aheadBehind(
    cwd: string,
    branch: string,
    upstream: string
  ): Promise<{ ahead: number; behind: number } | null> {
    try {
      const out = await GitExecutor.exec(
        cwd,
        ["rev-list", "--left-right", "--count", `${branch}...${upstream}`],
        { ignoreErrors: true }
      );
      const [aheadStr, behindStr] = out.split(/\s+/);
      const ahead = Number.parseInt(aheadStr, 10);
      const behind = Number.parseInt(behindStr, 10);
      if (Number.isNaN(ahead) || Number.isNaN(behind)) {return null;}
      return { ahead, behind };
    } catch {
      return null;
    }
  }

  /**
   * Checkouts a commit or branch.
   */
  public static async checkout(cwd: string, ref: string): Promise<string> {
    return GitExecutor.exec(cwd, ["checkout", ref]);
  }

  /**
   * Deletes a branch.
   */
  public static async deleteBranch(
    cwd: string,
    branch: string
  ): Promise<string> {
    return GitExecutor.exec(cwd, ["branch", "-D", branch]);
  }

  /**
   * Merges a branch into the current branch.
   */
  public static async merge(cwd: string, branch: string): Promise<string> {
    return GitExecutor.exec(cwd, ["merge", branch]);
  }

  /**
   * Creates a branch.
   */
  public static async createBranch(
    cwd: string,
    branch: string,
    startPoint?: string
  ): Promise<string> {
    const args = ["branch", branch];
    if (startPoint) {
      args.push(startPoint);
    }
    return GitExecutor.exec(cwd, args);
  }
}
