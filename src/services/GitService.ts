import { spawn } from "child_process";

export interface GitCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  refs: string[];
  message: string;
}

export class GitService {
  /**
   * Executes a git command in the given working directory.
   */
  private static async exec(cwd: string, args: string[]): Promise<string> {
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

  /**
   * Fetches the git log for the given repository.
   */
  public static async getLog(cwd: string): Promise<GitCommit[]> {
    const separator = "|||";
    const format = [
      "%H", // Hash
      "%P", // Parents
      "%an", // Author Name
      "%ae", // Author Email
      "%ad", // Author Date
      "%D", // Refs (Branches, Tags)
      "%s", // Subject
    ].join(separator);

    try {
      const output = await this.exec(cwd, [
        "log",
        `--pretty=format:${format}`,
        "--all", // Fetch all refs (branches, remotes, tags)
        "-n",
        "100", // Limit to 100 for now
        "--date=iso",
      ]);

      return output.split("\n").map((line) => {
        const [hash, parents, author, email, date, refs, message] =
          line.split(separator);
        return {
          hash,
          parents: parents ? parents.split(" ") : [],
          author,
          email,
          date,
          refs: refs ? refs.split(", ").filter((r) => r) : [],
          message,
        };
      });
    } catch (error) {
      console.error("Failed to fetch git log:", error);
      return [];
    }
  }

  /**
   * Gets the root of the git repository from the given path.
   */
  public static async getRepoRoot(path: string): Promise<string | null> {
    try {
      const root = await this.exec(path, ["rev-parse", "--show-toplevel"]);
      return root;
    } catch {
      return null;
    }
  }
}
