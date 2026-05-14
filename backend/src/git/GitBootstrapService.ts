import type { BootstrapResponse } from "@git-viz/shared";
import { GitLogService } from "./GitLogService";
import { GitRefService } from "./GitRefService";
import { GitRepoService } from "./GitRepoService";

export class GitBootstrapService {
  /**
   * Initial-load aggregator: returns repo info, full ref snapshot, and the
   * first page of commits in one parallel fetch.
   */
  public static async get(cwd: string, limit: number = 500): Promise<BootstrapResponse> {
    const [repo, refs, firstPage] = await Promise.all([
      GitRepoService.getRepoInfo(cwd),
      GitRefService.getAll(cwd, true),
      GitLogService.getCommitsPage(cwd, undefined, limit),
    ]);
    return { repo, refs, firstPage };
  }
}
