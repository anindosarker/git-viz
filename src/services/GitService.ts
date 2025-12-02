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
    // The format string uses %n to separate fields, making parsing simpler.
    // Each commit will be a block of 7 lines.
    const format = "%H%n%P%n%an%n%ae%n%ad%n%D%n%s";

    try {
      const output = await this.exec(cwd, [
        "log",
        "--all", // Fetch all refs (branches, remotes, tags)
        "--decorate", // Show ref names (branches, tags)
        "--date=iso-strict", // Use strict ISO 8601 format for dates
        `--format=${format}`, // Custom format for output
        "-n",
        "1000", // Fetch 1000 commits
      ]);

      const lines = output.split("\n");
      const commits: GitCommit[] = [];
      let currentCommit: any = {};
      let state = 0; // 0: Hash, 1: Parents, 2: Author, 3: Email, 4: Date, 5: Refs, 6: Message

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // If we are expecting a new commit (state 0) and line is empty, skip
        if (state === 0 && line.trim() === "") continue;

        if (state === 0) {
          currentCommit = {
            hash: line.trim(),
            parents: [],
            author: "",
            email: "",
            date: "",
            refs: [],
            message: "",
          };
          state++;
        } else if (state === 1) {
          currentCommit.parents = line.trim() ? line.trim().split(" ") : [];
          state++;
        } else if (state === 2) {
          currentCommit.author = line.trim();
          state++;
        } else if (state === 3) {
          currentCommit.email = line.trim();
          state++;
        } else if (state === 4) {
          currentCommit.date = line.trim();
          state++;
        } else if (state === 5) {
          currentCommit.refs = line.trim()
            ? line
                .trim()
                .split(", ")
                .map((r: string) => r.trim())
            : [];
          state++;
        } else if (state === 6) {
          currentCommit.message = line.trim();
          commits.push(currentCommit as GitCommit);
          state = 0;
        }
      }

      return commits;
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
