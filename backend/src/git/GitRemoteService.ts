import { GitRemote } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

export class GitRemoteService {
  /**
   * Lists configured remotes with both fetch and push URLs.
   *
   * `git remote -v` outputs two lines per remote (one tagged `(fetch)`, one
   * `(push)`). When push URL is not separately configured, git emits the same
   * URL for both — that's the common case.
   */
  public static async list(cwd: string): Promise<GitRemote[]> {
    const out = await GitExecutor.exec(cwd, ["remote", "-v"]);
    if (!out) {
      return [];
    }

    const map = new Map<string, { fetchUrl: string; pushUrl: string }>();

    for (const line of out.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      // Format: <name>\t<url> (<role>)
      const tabIdx = line.indexOf("\t");
      if (tabIdx === -1) {
        continue;
      }
      const name = line.slice(0, tabIdx);
      const rest = line.slice(tabIdx + 1);

      const lastSpace = rest.lastIndexOf(" ");
      if (lastSpace === -1) {
        continue;
      }
      const url = rest.slice(0, lastSpace);
      const role = rest.slice(lastSpace + 1); // "(fetch)" or "(push)"

      const entry = map.get(name) ?? { fetchUrl: "", pushUrl: "" };
      if (role === "(fetch)") {
        entry.fetchUrl = url;
      } else if (role === "(push)") {
        entry.pushUrl = url;
      }
      map.set(name, entry);
    }

    const remotes: GitRemote[] = [];
    for (const [name, { fetchUrl, pushUrl }] of map) {
      // Either URL may be empty if git only reported one; fall back to the other.
      remotes.push({
        name,
        fetchUrl: fetchUrl || pushUrl,
        pushUrl: pushUrl || fetchUrl,
      });
    }
    return remotes;
  }
}
