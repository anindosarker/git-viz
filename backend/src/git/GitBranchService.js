"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitBranchService = void 0;
const GitExecutor_1 = require("./GitExecutor");
class GitBranchService {
  /**
   * Checkouts a commit or branch.
   */
  static async checkout(cwd, ref) {
    return GitExecutor_1.GitExecutor.exec(cwd, ["checkout", ref]);
  }
  /**
   * Deletes a branch.
   */
  static async deleteBranch(cwd, branch) {
    return GitExecutor_1.GitExecutor.exec(cwd, ["branch", "-D", branch]);
  }
  /**
   * Merges a branch into the current branch.
   */
  static async merge(cwd, branch) {
    return GitExecutor_1.GitExecutor.exec(cwd, ["merge", branch]);
  }
  /**
   * Creates a branch.
   */
  static async createBranch(cwd, branch, startPoint) {
    const args = ["branch", branch];
    if (startPoint) {
      args.push(startPoint);
    }
    return GitExecutor_1.GitExecutor.exec(cwd, args);
  }
}
exports.GitBranchService = GitBranchService;
//# sourceMappingURL=GitBranchService.js.map
