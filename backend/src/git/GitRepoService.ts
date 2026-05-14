import path from "path";
import type { GitRepoInfo, GitHeadState } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

export class GitRepoService {
  /**
   * Returns repository info: name, root, HEAD state, and dirty bit.
   */
  public static async getRepoInfo(cwd: string): Promise<GitRepoInfo> {
    try {
      const root = await GitExecutor.exec(cwd, [
        "rev-parse",
        "--show-toplevel",
      ]);
      const name = path.basename(root);
      const head = await GitRepoService.getHeadState(root);
      const status = await GitExecutor.exec(root, [
        "status",
        "--porcelain",
        "--no-renames",
        "-uno",
      ]);
      const hasUncommittedChanges = status.length > 0;
      return { name, root, head, hasUncommittedChanges };
    } catch (error) {
      console.error("Failed to fetch repo info:", error);
      return {
        name: "",
        root: "",
        head: { detached: false, hash: "", shortHash: "" },
        hasUncommittedChanges: false,
      };
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

  private static async getHeadState(cwd: string): Promise<GitHeadState> {
    const hash = await GitExecutor.exec(cwd, ["rev-parse", "HEAD"]);
    const shortHash = hash.slice(0, 7);
    try {
      const symbolic = await GitExecutor.exec(cwd, [
        "symbolic-ref",
        "--quiet",
        "HEAD",
      ]);
      const branch = symbolic.replace(/^refs\/heads\//, "");
      return { detached: false, branch, hash, shortHash };
    } catch {
      return { detached: true, hash, shortHash };
    }
  }
}
