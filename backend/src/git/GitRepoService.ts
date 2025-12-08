import { GitExecutor } from "./GitExecutor";

export class GitRepoService {
  /**
   * Gets repository information (name and current branch).
   */
  public static async getRepoInfo(
    cwd: string
  ): Promise<{ repo: string; branch: string }> {
    try {
      const repoRoot = await GitExecutor.exec(cwd, [
        "rev-parse",
        "--show-toplevel",
      ]);
      const branch = await GitExecutor.exec(cwd, ["branch", "--show-current"]);
      const repoName = repoRoot.split("/").pop() || "";
      return { repo: repoName, branch };
    } catch (error) {
      console.error("Failed to fetch repo info:", error);
      return { repo: "", branch: "" };
    }
  }

  /**
   * Gets the root of the git repository from the given path.
   */
  public static async getRepoRoot(path: string): Promise<string | null> {
    try {
      const root = await GitExecutor.exec(path, [
        "rev-parse",
        "--show-toplevel",
      ]);
      return root;
    } catch {
      return null;
    }
  }
}
