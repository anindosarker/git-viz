import { describe, it, expect } from "vitest";
import path from "path";
import { classifyChange } from "../GitWatcher";

const CWD = path.resolve("/tmp/repo");

function rel(p: string): string {
  return path.join(CWD, p);
}

describe("classifyChange", () => {
  it("returns empty for paths outside cwd", () => {
    expect(classifyChange("/other/repo/HEAD", CWD)).toEqual([]);
  });

  it("returns empty for cwd itself", () => {
    expect(classifyChange(CWD, CWD)).toEqual([]);
  });

  it("classifies .git/HEAD as head", () => {
    expect(classifyChange(rel(".git/HEAD"), CWD)).toEqual(["head"]);
  });

  it("classifies ORIG_HEAD / MERGE_HEAD / FETCH_HEAD as head", () => {
    expect(classifyChange(rel(".git/ORIG_HEAD"), CWD)).toEqual(["head"]);
    expect(classifyChange(rel(".git/MERGE_HEAD"), CWD)).toEqual(["head"]);
    expect(classifyChange(rel(".git/FETCH_HEAD"), CWD)).toEqual(["head"]);
  });

  it("classifies packed-refs as refs + commits", () => {
    expect(classifyChange(rel(".git/packed-refs"), CWD)).toEqual(["refs", "commits"]);
  });

  it("classifies refs/heads/* as refs + commits", () => {
    expect(classifyChange(rel(".git/refs/heads/main"), CWD)).toEqual(["refs", "commits"]);
    expect(classifyChange(rel(".git/refs/heads/feature/x"), CWD)).toEqual(["refs", "commits"]);
  });

  it("classifies refs/tags/* as refs + commits", () => {
    expect(classifyChange(rel(".git/refs/tags/v1.0"), CWD)).toEqual(["refs", "commits"]);
  });

  it("classifies refs/remotes/* as refs + commits", () => {
    expect(classifyChange(rel(".git/refs/remotes/origin/main"), CWD)).toEqual(["refs", "commits"]);
  });

  it("classifies stashes as stashes (not refs)", () => {
    expect(classifyChange(rel(".git/refs/stash"), CWD)).toEqual(["stashes"]);
    expect(classifyChange(rel(".git/logs/refs/stash"), CWD)).toEqual(["stashes"]);
  });

  it("classifies logs/HEAD as head + commits", () => {
    expect(classifyChange(rel(".git/logs/HEAD"), CWD)).toEqual(["head", "commits"]);
  });

  it("classifies logs/refs/heads/* as refs", () => {
    expect(classifyChange(rel(".git/logs/refs/heads/main"), CWD)).toEqual(["refs"]);
  });

  it("classifies .git/index as workingTree", () => {
    expect(classifyChange(rel(".git/index"), CWD)).toEqual(["workingTree"]);
  });

  it("ignores .git/objects/*", () => {
    expect(classifyChange(rel(".git/objects/ab/abcdef"), CWD)).toEqual([]);
  });

  it("ignores *.lock files", () => {
    expect(classifyChange(rel(".git/index.lock"), CWD)).toEqual([]);
    expect(classifyChange(rel(".git/refs/heads/main.lock"), CWD)).toEqual([]);
  });

  it("classifies working tree edits as workingTree", () => {
    expect(classifyChange(rel("src/index.ts"), CWD)).toEqual(["workingTree"]);
    expect(classifyChange(rel("README.md"), CWD)).toEqual(["workingTree"]);
  });

  it("treats relative paths the same as absolute", () => {
    expect(classifyChange(".git/HEAD", CWD)).toEqual(["head"]);
    expect(classifyChange("src/foo.ts", CWD)).toEqual(["workingTree"]);
  });

  it("classifies linked-worktree gitdir paths", () => {
    const gitDir = "/parent/repo/.git/worktrees/feature";
    expect(classifyChange(`${gitDir}/HEAD`, CWD, gitDir)).toEqual(["head"]);
    expect(classifyChange(`${gitDir}/refs/heads/feature`, CWD, gitDir)).toEqual([
      "refs",
      "commits",
    ]);
    expect(classifyChange(`${gitDir}/objects/foo`, CWD, gitDir)).toEqual([]);
  });
});
