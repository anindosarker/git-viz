import type { GitCommitSummary, GitRefsSnapshot } from "@git-viz/shared";
import { describe, expect, it } from "vitest";
import { WORKING_TREE_HASH, joinCommits } from "../join";

function commit(hash: string, parents: string[] = []): GitCommitSummary {
  return {
    hash,
    parents,
    author: "a",
    authorEmail: "a@x",
    authorDate: "2026-01-01T00:00:00Z",
    committer: "a",
    committerEmail: "a@x",
    committerDate: "2026-01-01T00:00:00Z",
    subject: `commit ${hash}`,
  };
}

function refs(headHash: string, branches: { name: string; tip: string }[] = []): GitRefsSnapshot {
  return {
    head: { detached: false, branch: "main", hash: headHash, shortHash: headHash.slice(0, 7) },
    branches: branches.map((b) => ({
      name: b.name,
      tip: b.tip,
      isHead: b.tip === headHash,
      isRemote: false,
      lastCommitDate: "2026-01-01T00:00:00Z",
    })),
    tags: [],
    stashes: [],
  };
}

describe("joinCommits", () => {
  it("tags the HEAD commit with kind=HEAD", () => {
    const commits = [commit("a", ["b"]), commit("b", [])];
    const result = joinCommits({
      commits,
      refs: refs("a", [{ name: "main", tip: "a" }]),
      head: { detached: false, branch: "main", hash: "a", shortHash: "a" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("HEAD");
    expect(result[1].kind).toBe("node");
  });

  it("prepends a working-tree row when dirty", () => {
    const commits = [commit("a", ["b"]), commit("b", [])];
    const result = joinCommits({
      commits,
      refs: refs("a"),
      workingTreeDirty: true,
    });
    expect(result[0].kind).toBe("working-tree");
    expect(result[0].commit.hash).toBe(WORKING_TREE_HASH);
    expect(result[0].commit.parents).toEqual(["a"]);
    expect(result[1].kind).toBe("HEAD");
  });

  it("joins refs onto commits", () => {
    const commits = [commit("a", []), commit("b", [])];
    const result = joinCommits({
      commits,
      refs: refs("a", [
        { name: "main", tip: "a" },
        { name: "topic", tip: "b" },
      ]),
    });
    const aRefs = result[0].commit.refs.map((r) => r.name).sort();
    const bRefs = result[1].commit.refs.map((r) => r.name).sort();
    expect(aRefs).toContain("main");
    expect(bRefs).toContain("topic");
  });
});
