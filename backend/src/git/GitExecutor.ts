import { spawn } from "child_process";

export interface ExecOptions {
  /** When true, captures stdout as Buffer (preserves NUL bytes). */
  binary?: boolean;
  /** Maximum bytes to buffer in stdout before aborting (default 200MB). */
  maxBuffer?: number;
  /** When true, do not throw if the command exits non-zero; resolve with stdout. */
  ignoreErrors?: boolean;
  /** Optional stdin payload. */
  stdin?: string;
}

export class GitExecutor {
  /**
   * Executes a git command in the given working directory and returns trimmed stdout.
   */
  public static async exec(
    cwd: string,
    args: string[],
    options?: ExecOptions
  ): Promise<string> {
    const buf = await GitExecutor.execBuffer(cwd, args, options);
    const s = buf.toString("utf8");
    // Preserve trailing NUL when binary (caller likely needs raw bytes); otherwise trim.
    return options?.binary ? s : s.trim();
  }

  /**
   * Executes a git command and returns raw stdout as a Buffer. Required for
   * commands using `-z` / NUL-delimited output.
   */
  public static async execBuffer(
    cwd: string,
    args: string[],
    options: ExecOptions = {}
  ): Promise<Buffer> {
    const maxBuffer = options.maxBuffer ?? 200 * 1024 * 1024;
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, { cwd });
      const stdoutChunks: Buffer[] = [];
      let stdoutLen = 0;
      let stderr = "";
      let killed = false;

      child.stdout.on("data", (chunk: Buffer) => {
        stdoutLen += chunk.length;
        if (stdoutLen > maxBuffer) {
          killed = true;
          child.kill("SIGKILL");
          reject(
            new Error(
              `git ${args[0]} exceeded maxBuffer (${maxBuffer} bytes)`
            )
          );
          return;
        }
        stdoutChunks.push(chunk);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (err) => {
        if (killed) return;
        reject(err);
      });

      child.on("close", (code) => {
        if (killed) return;
        if (code === 0 || options.ignoreErrors) {
          resolve(Buffer.concat(stdoutChunks));
        } else {
          reject(
            new Error(
              `git ${args.join(" ")} failed (exit ${code}): ${stderr.trim()}`
            )
          );
        }
      });

      if (options.stdin !== undefined) {
        child.stdin.write(options.stdin);
        child.stdin.end();
      }
    });
  }
}
