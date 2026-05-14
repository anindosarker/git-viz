import { GitTag } from "@git-viz/shared";
import { GitExecutor } from "./GitExecutor";

const FIELD_SEP = "\x00";

export class GitTagService {
  /**
   * Lists all tags. Annotated tags include a peeled commit target, message,
   * and tagger date; lightweight tags point directly at a commit.
   */
  public static async list(cwd: string): Promise<GitTag[]> {
    // Fields:
    //   refname:short, objectname, *objectname (peeled — set only for annotated tags),
    //   contents:subject, taggerdate:iso-strict
    const format =
      "%(refname:short)%00%(objectname)%00%(*objectname)%00%(contents:subject)%00%(taggerdate:iso-strict)";

    const buf = await GitExecutor.execBuffer(cwd, [
      "for-each-ref",
      `--format=${format}`,
      "refs/tags",
    ]);

    const raw = buf.toString("utf8");
    if (!raw.trim()) {
      return [];
    }

    const tags: GitTag[] = [];

    for (const line of raw.split("\n")) {
      if (!line) {
        continue;
      }
      const [name, objectName, peeled, subject, taggerDate] = line.split(FIELD_SEP);
      if (!name || !objectName) {
        continue;
      }

      const annotated = !!peeled;
      const tag: GitTag = {
        name,
        target: annotated ? peeled : objectName,
        annotated,
      };
      if (annotated && subject) {
        tag.message = subject;
      }
      if (annotated && taggerDate) {
        tag.taggerDate = taggerDate;
      }
      tags.push(tag);
    }

    return tags;
  }
}
