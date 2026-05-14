import { GitBranchService } from "@git-viz/backend/GitBranchService";
import { GitExecutor } from "@git-viz/backend/GitExecutor";
import { GitLogService } from "@git-viz/backend/GitLogService";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import { GitCommit } from "@git-viz/shared";

// Re-export type for consumers
export { GitCommit };

/**
 * A facade class that delegates git operations to specialized services.
 * This maintains compatibility with existing code while improving internal organization.
 */
export class GitService {
  /**
   * Executes a git command in the given working directory.
   */
  public static async exec(cwd: string, args: string[]): Promise<string> {
    return GitExecutor.exec(cwd, args);
  }

  /**
   * Gets repository information in the legacy `{ repo, branch }` shape used by
   * the existing webview frontend. New code should call
   * `GitRepoService.getRepoInfo` directly for the full `GitRepoInfo`.
   */
  public static async getRepoInfo(
    cwd: string
  ): Promise<{ repo: string; branch: string }> {
    const info = await GitRepoService.getRepoInfo(cwd);
    const branch = info.head.detached
      ? `(detached ${info.head.shortHash})`
      : info.head.branch ?? "";
    return { repo: info.name, branch };
  }

  /**
   * Legacy log fetch: returns the first page of commits as a flat array.
   * New code should use the paged `commits:getPage` endpoint.
   */
  public static async getLog(cwd: string): Promise<GitCommit[]> {
    const page = await GitLogService.getCommitsPage(cwd, undefined, 500);
    return page.commits;
  }

  /**
   * Gets the root of the git repository from the given path.
   */
  public static async getRepoRoot(path: string): Promise<string | null> {
    return GitRepoService.getRepoRoot(path);
  }

  /**
   * Checkouts a commit or branch.
   */
  public static async checkout(cwd: string, ref: string): Promise<string> {
    return GitBranchService.checkout(cwd, ref);
  }

  /**
   * Deletes a branch.
   */
  public static async deleteBranch(
    cwd: string,
    branch: string
  ): Promise<string> {
    return GitBranchService.deleteBranch(cwd, branch);
  }

  /**
   * Merges a branch into the current branch.
   */
  public static async merge(cwd: string, branch: string): Promise<string> {
    return GitBranchService.merge(cwd, branch);
  }

  /**
   * Creates a branch.
   */
  public static async createBranch(
    cwd: string,
    branch: string,
    startPoint?: string
  ): Promise<string> {
    return GitBranchService.createBranch(cwd, branch, startPoint);
  }
}
