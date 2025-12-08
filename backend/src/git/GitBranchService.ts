import { GitExecutor } from "./GitExecutor";

export class GitBranchService {
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
