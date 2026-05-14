"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitExecutor = void 0;
const child_process_1 = require("child_process");
class GitExecutor {
  /**
   * Executes a git command in the given working directory.
   */
  static async exec(cwd, args) {
    return new Promise((resolve, reject) => {
      const process = (0, child_process_1.spawn)("git", args, { cwd });
      let stdout = "";
      let stderr = "";
      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      process.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Git command failed: ${stderr}`));
        }
      });
    });
  }
}
exports.GitExecutor = GitExecutor;
//# sourceMappingURL=GitExecutor.js.map
