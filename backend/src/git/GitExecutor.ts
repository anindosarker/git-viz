import { spawn } from "child_process";

export class GitExecutor {
  /**
   * Executes a git command in the given working directory.
   */
  public static async exec(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn("git", args, { cwd });
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
