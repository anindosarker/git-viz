import { spawn } from "child_process";
import type { GitActionResult } from "@git-viz/shared";

export type { GitActionResult };

interface RunOptions {
  stdin?: string;
  maxBuffer?: number;
}

/**
 * Orchestrates mutating git commands. Unlike GitExecutor.exec, every call
 * resolves with a structured result containing stdout/stderr/exitCode so the
 * frontend can render success or surface stderr verbatim with hint matching.
 */
export class GitActionService {
  public static async run(
    cwd: string,
    args: string[],
    options: RunOptions = {}
  ): Promise<GitActionResult> {
    const maxBuffer = options.maxBuffer ?? 50 * 1024 * 1024;
    return new Promise((resolve) => {
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
          resolve({
            ok: false,
            stdout: Buffer.concat(stdoutChunks).toString("utf8"),
            stderr: `output exceeded ${maxBuffer} bytes`,
            exitCode: -1,
          });
          return;
        }
        stdoutChunks.push(chunk);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (err) => {
        if (killed) {
          return;
        }
        resolve({
          ok: false,
          stdout: "",
          stderr: err.message,
          exitCode: -1,
        });
      });

      child.on("close", (code) => {
        if (killed) {
          return;
        }
        const exitCode = code ?? -1;
        resolve({
          ok: exitCode === 0,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: stderr.trim(),
          exitCode,
        });
      });

      if (options.stdin !== undefined) {
        child.stdin.write(options.stdin);
        child.stdin.end();
      }
    });
  }

  // ── Branch ────────────────────────────────────────────────────────────────

  public static branchCreate(
    cwd: string,
    p: { name: string; startPoint?: string; checkout?: boolean }
  ): Promise<GitActionResult> {
    if (p.checkout) {
      const args = ["checkout", "-b", p.name];
      if (p.startPoint) {
        args.push(p.startPoint);
      }
      return GitActionService.run(cwd, args);
    }
    const args = ["branch", p.name];
    if (p.startPoint) {
      args.push(p.startPoint);
    }
    return GitActionService.run(cwd, args);
  }

  public static branchRename(
    cwd: string,
    p: { from: string; to: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["branch", "-m", p.from, p.to]);
  }

  public static branchDelete(
    cwd: string,
    p: { name: string; force?: boolean }
  ): Promise<GitActionResult> {
    const flag = p.force ? "-D" : "-d";
    return GitActionService.run(cwd, ["branch", flag, p.name]);
  }

  public static branchSetUpstream(
    cwd: string,
    p: { branch: string; upstream: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["branch", `--set-upstream-to=${p.upstream}`, p.branch]);
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  public static checkoutRef(
    cwd: string,
    p: { ref: string; force?: boolean }
  ): Promise<GitActionResult> {
    const args = ["checkout"];
    if (p.force) {
      args.push("--force");
    }
    args.push(p.ref);
    return GitActionService.run(cwd, args);
  }

  // ── Merge / Rebase / Cherry-pick / Revert / Reset ─────────────────────────

  public static merge(
    cwd: string,
    p: { ref: string; noFF?: boolean; message?: string }
  ): Promise<GitActionResult> {
    const args = ["merge"];
    if (p.noFF) {
      args.push("--no-ff");
    }
    if (p.message) {
      args.push("-m", p.message);
    }
    args.push(p.ref);
    return GitActionService.run(cwd, args);
  }

  public static mergeAbort(cwd: string): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["merge", "--abort"]);
  }

  public static rebase(cwd: string, p: { onto: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["rebase", p.onto]);
  }

  public static rebaseAbort(cwd: string): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["rebase", "--abort"]);
  }

  public static rebaseContinue(cwd: string): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["rebase", "--continue"]);
  }

  public static cherryPick(
    cwd: string,
    p: { hashes: string[]; annotate?: boolean }
  ): Promise<GitActionResult> {
    const args = ["cherry-pick"];
    if (p.annotate) {
      args.push("-x");
    }
    args.push(...p.hashes);
    return GitActionService.run(cwd, args);
  }

  public static revert(cwd: string, p: { hash: string; edit?: boolean }): Promise<GitActionResult> {
    const args = ["revert"];
    if (!p.edit) {
      args.push("--no-edit");
    }
    args.push(p.hash);
    return GitActionService.run(cwd, args);
  }

  public static reset(
    cwd: string,
    p: { mode: "soft" | "mixed" | "hard"; target: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["reset", `--${p.mode}`, p.target]);
  }

  // ── Tag ───────────────────────────────────────────────────────────────────

  public static tagCreate(
    cwd: string,
    p: { name: string; target?: string; annotated?: boolean; message?: string }
  ): Promise<GitActionResult> {
    const args = ["tag"];
    if (p.annotated) {
      args.push("-a", p.name);
      args.push("-m", p.message ?? p.name);
    } else {
      args.push(p.name);
    }
    if (p.target) {
      args.push(p.target);
    }
    return GitActionService.run(cwd, args);
  }

  public static tagDelete(cwd: string, p: { name: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["tag", "-d", p.name]);
  }

  public static tagPush(
    cwd: string,
    p: { name: string; remote: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["push", p.remote, `refs/tags/${p.name}`]);
  }

  // ── Stash ─────────────────────────────────────────────────────────────────

  public static stashCreate(
    cwd: string,
    p: { message?: string; includeUntracked?: boolean }
  ): Promise<GitActionResult> {
    const args = ["stash", "push"];
    if (p.includeUntracked) {
      args.push("--include-untracked");
    }
    if (p.message) {
      args.push("-m", p.message);
    }
    return GitActionService.run(cwd, args);
  }

  public static stashApply(cwd: string, p: { ref: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["stash", "apply", p.ref]);
  }

  public static stashPop(cwd: string, p: { ref: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["stash", "pop", p.ref]);
  }

  public static stashDrop(cwd: string, p: { ref: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["stash", "drop", p.ref]);
  }

  public static stashBranch(
    cwd: string,
    p: { ref: string; branchName: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["stash", "branch", p.branchName, p.ref]);
  }

  // ── Remote ────────────────────────────────────────────────────────────────

  public static remoteFetch(cwd: string, p: { remote?: string }): Promise<GitActionResult> {
    const args = ["fetch"];
    if (p.remote) {
      args.push(p.remote);
    } else {
      args.push("--all");
    }
    return GitActionService.run(cwd, args);
  }

  public static remotePull(
    cwd: string,
    p: { strategy: "ff" | "merge" | "rebase" }
  ): Promise<GitActionResult> {
    const args = ["pull"];
    if (p.strategy === "ff") {
      args.push("--ff-only");
    } else if (p.strategy === "rebase") {
      args.push("--rebase");
    } else {
      args.push("--no-rebase");
    }
    return GitActionService.run(cwd, args);
  }

  public static remotePush(
    cwd: string,
    p: { branch?: string; remote?: string; force?: boolean; tags?: boolean }
  ): Promise<GitActionResult> {
    const args = ["push"];
    if (p.force) {
      args.push("--force-with-lease");
    }
    if (p.tags) {
      args.push("--tags");
    }
    if (p.remote) {
      args.push(p.remote);
    }
    if (p.branch) {
      args.push(p.branch);
    }
    return GitActionService.run(cwd, args);
  }

  public static remoteAdd(cwd: string, p: { name: string; url: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["remote", "add", p.name, p.url]);
  }

  public static remoteRemove(cwd: string, p: { name: string }): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["remote", "remove", p.name]);
  }

  public static remoteRename(
    cwd: string,
    p: { from: string; to: string }
  ): Promise<GitActionResult> {
    return GitActionService.run(cwd, ["remote", "rename", p.from, p.to]);
  }
}
