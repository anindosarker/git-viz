import path from "path";
import type { GitSubmodule } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

export class GitSubmoduleService {
  /**
   * Lists submodules of the given repo via `git submodule status --recursive`.
   * Returns an empty array if the repo has no submodules.
   *
   * Output line format:
   *   ` <hash> <path> (ref)`   initialized
   *   `-<hash> <path>`         uninitialized
   *   `+<hash> <path> (ref)`   currently checked out hash differs from index
   *   `U<hash> <path>`         merge conflict
   */
  public static async list(cwd: string): Promise<GitSubmodule[]> {
    let raw: string;
    try {
      raw = await GitExecutor.exec(cwd, ["submodule", "status", "--recursive"], {
        ignoreErrors: true,
      });
    } catch {
      return [];
    }
    if (!raw) {
      return [];
    }

    const submodules: GitSubmodule[] = [];
    const urls = await GitSubmoduleService.readSubmoduleUrls(cwd);

    for (const line of raw.split("\n")) {
      if (!line) {
        continue;
      }
      const marker = line.charAt(0);
      const rest = line.slice(1);
      const firstSpace = rest.indexOf(" ");
      if (firstSpace < 0) {
        continue;
      }
      const hash = rest.slice(0, firstSpace);
      const after = rest.slice(firstSpace + 1).trim();
      const parenIdx = after.lastIndexOf(" (");
      const submodulePath = parenIdx >= 0 ? after.slice(0, parenIdx) : after;
      const name = path.basename(submodulePath);
      submodules.push({
        name,
        path: submodulePath,
        hash,
        url: urls[submodulePath] ?? "",
        initialized: marker !== "-",
      });
    }
    return submodules;
  }

  private static async readSubmoduleUrls(cwd: string): Promise<Record<string, string>> {
    try {
      const raw = await GitExecutor.exec(
        cwd,
        ["config", "-f", ".gitmodules", "--get-regexp", "^submodule\\..*\\.(path|url)$"],
        { ignoreErrors: true }
      );
      if (!raw) {
        return {};
      }
      const byKey: Record<string, { path?: string; url?: string }> = {};
      for (const line of raw.split("\n")) {
        const m = /^submodule\.([^.]+)\.(path|url)\s+(.*)$/.exec(line);
        if (!m) {
          continue;
        }
        const key = m[1];
        const field = m[2] as "path" | "url";
        byKey[key] ??= {};
        byKey[key][field] = m[3];
      }
      const result: Record<string, string> = {};
      for (const v of Object.values(byKey)) {
        if (v.path && v.url) {
          result[v.path] = v.url;
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}
