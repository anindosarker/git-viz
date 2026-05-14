"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitRepoService = void 0;
const GitExecutor_1 = require("./GitExecutor");
class GitRepoService {
  /**
   * Gets repository information (name and current branch).
   */
  static async getRepoInfo(cwd) {
    try {
      const repoRoot = await GitExecutor_1.GitExecutor.exec(cwd, ["rev-parse", "--show-toplevel"]);
      const branch = await GitExecutor_1.GitExecutor.exec(cwd, ["branch", "--show-current"]);
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
  static async getRepoRoot(path) {
    try {
      const root = await GitExecutor_1.GitExecutor.exec(path, ["rev-parse", "--show-toplevel"]);
      return root;
    } catch {
      return null;
    }
  }
}
exports.GitRepoService = GitRepoService;
//# sourceMappingURL=GitRepoService.js.map
