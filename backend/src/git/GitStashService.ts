import { GitStash } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

const FIELD_SEP = "\x00";

export class GitStashService {
  /**
   * Lists stash entries.
   *
   * `%gs` (stash subject) can contain newlines, so we use `-z` to make git
   * NUL-terminate each record. Fields within a record are split by our own
   * `%x00` markers, leaving the final NUL as the record terminator.
   */
  public static async list(cwd: string): Promise<GitStash[]> {
    const format = "%H%x00%gd%x00%gs%x00%ci";

    const buf = await GitExecutor.execBuffer(cwd, [
      "stash",
      "list",
      `--format=${format}`,
      "-z",
    ]);

    const raw = buf.toString("utf8");
    if (!raw) {return [];}

    const FIELD_COUNT = 4;
    const tokens = raw.split(FIELD_SEP);
    // `-z` adds a trailing NUL after the final record; drop the empty tail.
    if (tokens.length && tokens[tokens.length - 1] === "") {tokens.pop();}

    const stashes: GitStash[] = [];
    for (let i = 0; i + FIELD_COUNT - 1 < tokens.length; i += FIELD_COUNT) {
      const hash = tokens[i];
      const name = tokens[i + 1];
      const message = tokens[i + 2];
      const date = tokens[i + 3];
      if (!hash || !name) {continue;}
      stashes.push({ name, hash, message: message ?? "", date: date ?? "" });
    }

    return stashes;
  }
}
