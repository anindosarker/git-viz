import { describe, it, expect } from "vitest";
import {
  FIELD_SEP,
  RECORD_SEP,
  COMMIT_FORMAT_FIELDS,
  splitNulRecords,
  parseCommitRecord,
  parseCommitStream,
  parseNameStatusZ,
  parseNumstatZ,
  mergeFileChanges,
  parseShortStat,
  parseUnifiedDiff,
  classifyRef,
} from "../parsers";

const FS = FIELD_SEP;
const RS = RECORD_SEP;

function buildCommitRecord(parts: string[]): string {
  return parts.join(FS);
}

describe("separators", () => {
  it("uses ASCII US (0x1f) for fields and NUL (0x00) for records", () => {
    expect(FIELD_SEP.charCodeAt(0)).toBe(0x1f);
    expect(RECORD_SEP.charCodeAt(0)).toBe(0x00);
  });

  it("commit format declares all 9 fields", () => {
    expect(COMMIT_FORMAT_FIELDS).toHaveLength(9);
  });
});

describe("splitNulRecords", () => {
  it("returns [] for empty input", () => {
    expect(splitNulRecords("")).toEqual([]);
    expect(splitNulRecords(Buffer.alloc(0))).toEqual([]);
  });

  it("splits NUL-delimited records and drops trailing empty", () => {
    const input = `a${RS}b${RS}c${RS}`;
    expect(splitNulRecords(input)).toEqual(["a", "b", "c"]);
  });

  it("accepts a Buffer and decodes utf8", () => {
    const input = Buffer.from(`héllo${RS}wörld${RS}`, "utf8");
    expect(splitNulRecords(input)).toEqual(["héllo", "wörld"]);
  });

  it("keeps internal empty records (e.g., between two NULs)", () => {
    const input = `a${RS}${RS}b${RS}`;
    expect(splitNulRecords(input)).toEqual(["a", "", "b"]);
  });
});

describe("parseCommitRecord", () => {
  it("parses a normal commit record", () => {
    const rec = buildCommitRecord([
      "abc123",
      "p1 p2",
      "Alice",
      "alice@example.com",
      "2024-01-01T00:00:00+00:00",
      "Alice",
      "alice@example.com",
      "2024-01-01T00:00:00+00:00",
      "Initial commit",
    ]);
    const out = parseCommitRecord(rec);
    expect(out).toEqual({
      hash: "abc123",
      parents: ["p1", "p2"],
      author: "Alice",
      authorEmail: "alice@example.com",
      authorDate: "2024-01-01T00:00:00+00:00",
      committer: "Alice",
      committerEmail: "alice@example.com",
      committerDate: "2024-01-01T00:00:00+00:00",
      subject: "Initial commit",
    });
  });

  it("returns null for empty or undersized records", () => {
    expect(parseCommitRecord("")).toBeNull();
    expect(parseCommitRecord("a" + FS + "b")).toBeNull();
  });

  it("handles a leading newline left over from -z", () => {
    const rec =
      "\n" +
      buildCommitRecord([
        "h",
        "",
        "A",
        "a@x",
        "2024",
        "A",
        "a@x",
        "2024",
        "subj",
      ]);
    const out = parseCommitRecord(rec);
    expect(out?.hash).toBe("h");
    expect(out?.parents).toEqual([]);
  });

  it("returns null when hash is missing", () => {
    const rec = buildCommitRecord([
      "",
      "",
      "A",
      "a@x",
      "2024",
      "A",
      "a@x",
      "2024",
      "subj",
    ]);
    expect(parseCommitRecord(rec)).toBeNull();
  });
});

describe("parseCommitStream", () => {
  it("parses multiple commit records", () => {
    const rec1 = buildCommitRecord([
      "h1",
      "",
      "A",
      "a@x",
      "d1",
      "A",
      "a@x",
      "d1",
      "s1",
    ]);
    const rec2 = buildCommitRecord([
      "h2",
      "h1",
      "B",
      "b@x",
      "d2",
      "B",
      "b@x",
      "d2",
      "s2",
    ]);
    const out = parseCommitStream(`${rec1}${RS}${rec2}${RS}`);
    expect(out).toHaveLength(2);
    expect(out[0].hash).toBe("h1");
    expect(out[1].hash).toBe("h2");
    expect(out[1].parents).toEqual(["h1"]);
  });

  it("returns [] for empty input", () => {
    expect(parseCommitStream("")).toEqual([]);
  });
});

describe("parseNameStatusZ", () => {
  it("returns [] for empty input", () => {
    expect(parseNameStatusZ("")).toEqual([]);
  });

  it("parses A/M/D/T entries", () => {
    const text = `A${RS}foo.txt${RS}M${RS}bar.ts${RS}D${RS}old.md${RS}`;
    expect(parseNameStatusZ(text)).toEqual([
      { status: "A", path: "foo.txt" },
      { status: "M", path: "bar.ts" },
      { status: "D", path: "old.md" },
    ]);
  });

  it("parses R/C entries with score, oldPath, newPath", () => {
    const text = `R100${RS}src/old.ts${RS}src/new.ts${RS}C75${RS}a.js${RS}b.js${RS}`;
    expect(parseNameStatusZ(text)).toEqual([
      { status: "R", path: "src/new.ts", oldPath: "src/old.ts", score: 100 },
      { status: "C", path: "b.js", oldPath: "a.js", score: 75 },
    ]);
  });

  it("skips unknown status codes", () => {
    const text = `X${RS}weird${RS}A${RS}ok.txt${RS}`;
    expect(parseNameStatusZ(text)).toEqual([{ status: "A", path: "ok.txt" }]);
  });
});

describe("parseNumstatZ", () => {
  it("returns [] for empty input", () => {
    expect(parseNumstatZ("")).toEqual([]);
  });

  it("parses plain entries", () => {
    const text = `5\t3\tsrc/foo.ts${RS}1\t0\tREADME.md${RS}`;
    expect(parseNumstatZ(text)).toEqual([
      { insertions: 5, deletions: 3, path: "src/foo.ts", binary: false },
      { insertions: 1, deletions: 0, path: "README.md", binary: false },
    ]);
  });

  it("marks binary files (-\\t-) with zero counts and binary=true", () => {
    const text = `-\t-\timg.png${RS}`;
    expect(parseNumstatZ(text)).toEqual([
      { insertions: 0, deletions: 0, path: "img.png", binary: true },
    ]);
  });

  it("parses rename form (empty inline path -> next two tokens)", () => {
    const text = `4\t2\t${RS}old/path.ts${RS}new/path.ts${RS}`;
    expect(parseNumstatZ(text)).toEqual([
      {
        insertions: 4,
        deletions: 2,
        path: "new/path.ts",
        oldPath: "old/path.ts",
        binary: false,
      },
    ]);
  });
});

describe("mergeFileChanges", () => {
  it("merges name-status with numstat by path", () => {
    const ns = [
      { status: "M" as const, path: "a.ts" },
      { status: "R" as const, path: "new.ts", oldPath: "old.ts", score: 95 },
      { status: "A" as const, path: "unmatched.ts" },
    ];
    const nu = [
      { insertions: 3, deletions: 1, path: "a.ts", binary: false },
      {
        insertions: 10,
        deletions: 8,
        path: "new.ts",
        oldPath: "old.ts",
        binary: false,
      },
    ];
    expect(mergeFileChanges(ns, nu)).toEqual([
      {
        path: "a.ts",
        oldPath: undefined,
        status: "M",
        insertions: 3,
        deletions: 1,
      },
      {
        path: "new.ts",
        oldPath: "old.ts",
        status: "R",
        insertions: 10,
        deletions: 8,
      },
      {
        path: "unmatched.ts",
        oldPath: undefined,
        status: "A",
        insertions: 0,
        deletions: 0,
      },
    ]);
  });

  it("handles empty inputs", () => {
    expect(mergeFileChanges([], [])).toEqual([]);
  });
});

describe("parseShortStat", () => {
  it("parses a full stat line", () => {
    const s = " 3 files changed, 12 insertions(+), 4 deletions(-)";
    expect(parseShortStat(s)).toEqual({ files: 3, insertions: 12, deletions: 4 });
  });

  it("parses singular forms (1 file, 1 insertion, 1 deletion)", () => {
    const s = " 1 file changed, 1 insertion(+), 1 deletion(-)";
    expect(parseShortStat(s)).toEqual({ files: 1, insertions: 1, deletions: 1 });
  });

  it("handles only-insertions or only-deletions", () => {
    expect(parseShortStat(" 2 files changed, 5 insertions(+)")).toEqual({
      files: 2,
      insertions: 5,
      deletions: 0,
    });
    expect(parseShortStat(" 2 files changed, 5 deletions(-)")).toEqual({
      files: 2,
      insertions: 0,
      deletions: 5,
    });
  });

  it("returns zeros for empty input", () => {
    expect(parseShortStat("")).toEqual({ files: 0, insertions: 0, deletions: 0 });
  });
});

describe("parseUnifiedDiff", () => {
  it("returns [] for empty input", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
  });

  it("parses a single hunk with adds/dels/context", () => {
    const diff = [
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1,3 +1,4 @@ fn name",
      " unchanged",
      "-removed",
      "+added one",
      "+added two",
      " also unchanged",
    ].join("\n");
    const hunks = parseUnifiedDiff(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(1);
    expect(hunks[0].oldLines).toBe(3);
    expect(hunks[0].newStart).toBe(1);
    expect(hunks[0].newLines).toBe(4);
    expect(hunks[0].header).toBe(" fn name");
    expect(hunks[0].lines).toEqual([
      { kind: "context", text: "unchanged" },
      { kind: "del", text: "removed" },
      { kind: "add", text: "added one" },
      { kind: "add", text: "added two" },
      { kind: "context", text: "also unchanged" },
    ]);
  });

  it("parses multiple hunks", () => {
    const diff = [
      "@@ -1 +1 @@",
      "-a",
      "+b",
      "@@ -10,2 +10,2 @@",
      " x",
      "-y",
      "+z",
    ].join("\n");
    const hunks = parseUnifiedDiff(diff);
    expect(hunks).toHaveLength(2);
    expect(hunks[0].oldLines).toBe(1);
    expect(hunks[0].newLines).toBe(1);
    expect(hunks[1].oldStart).toBe(10);
    expect(hunks[1].lines.map((l) => l.kind)).toEqual(["context", "del", "add"]);
  });

  it('skips "\\ No newline at end of file" markers', () => {
    const diff = [
      "@@ -1 +1 @@",
      "-foo",
      "\\ No newline at end of file",
      "+bar",
    ].join("\n");
    const hunks = parseUnifiedDiff(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines).toEqual([
      { kind: "del", text: "foo" },
      { kind: "add", text: "bar" },
    ]);
  });
});

describe("classifyRef", () => {
  it("returns null for empty input", () => {
    expect(classifyRef("")).toBeNull();
    expect(classifyRef("   ")).toBeNull();
  });

  it('classifies bare "HEAD"', () => {
    expect(classifyRef("HEAD")).toEqual({
      type: "head",
      name: "HEAD",
      isHead: true,
    });
  });

  it('classifies "HEAD -> main" as branch with isHead', () => {
    expect(classifyRef("HEAD -> main")).toEqual({
      type: "branch",
      name: "main",
      isHead: true,
    });
  });

  it('classifies "tag: v1.0.0" as tag', () => {
    expect(classifyRef("tag: v1.0.0")).toEqual({
      type: "tag",
      name: "v1.0.0",
      isHead: false,
    });
  });

  it("classifies stash refs", () => {
    expect(classifyRef("refs/stash")).toEqual({
      type: "stash",
      name: "refs/stash",
      isHead: false,
    });
    expect(classifyRef("stash@{0}")).toEqual({
      type: "stash",
      name: "stash@{0}",
      isHead: false,
    });
  });

  it("classifies remote branches (contain /)", () => {
    expect(classifyRef("origin/main")).toEqual({
      type: "remote-branch",
      name: "origin/main",
      isHead: false,
    });
  });

  it("classifies plain names as local branches", () => {
    expect(classifyRef("feature-x")).toEqual({
      type: "branch",
      name: "feature-x",
      isHead: false,
    });
  });
});
