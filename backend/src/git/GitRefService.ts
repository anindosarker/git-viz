import type { GitRefsSnapshot } from "@git-viz/shared";
import { GitBranchService } from "./GitBranchService";
import { GitRepoService } from "./GitRepoService";
import { GitStashService } from "./GitStashService";
import { GitTagService } from "./GitTagService";

export class GitRefService {
  /**
   * Aggregates branches, tags, stashes, and HEAD state into a single
   * GitRefsSnapshot. Underlying calls run in parallel.
   */
  public static async getAll(cwd: string, includeRemote: boolean = true): Promise<GitRefsSnapshot> {
    const [branches, tags, stashes, repoInfo] = await Promise.all([
      GitBranchService.list(cwd, includeRemote),
      GitTagService.list(cwd),
      GitStashService.list(cwd),
      GitRepoService.getRepoInfo(cwd),
    ]);
    return { head: repoInfo.head, branches, tags, stashes };
  }
}
