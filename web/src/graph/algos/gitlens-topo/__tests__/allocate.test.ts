import type { GitHeadState, GitRefsSnapshot } from "@git-viz/shared";
import { describe, expect, it } from "vitest";
import { allocateLanes } from "../allocate";

function head(branch: string | undefined, hash: string): GitHeadState {
  return { detached: !branch, branch, hash, shortHash: hash.slice(0, 7) };
}

describe("allocateLanes", () => {
  it("orders refs: HEAD first, then locals by date desc, then remote-tracking, then other remotes, then tags", () => {
    const refs: GitRefsSnapshot = {
      head: head("main", "h1"),
      branches: [
        {
          name: "main",
          tip: "h1",
          isHead: true,
          isRemote: false,
          lastCommitDate: "2026-01-03T00:00:00Z",
        },
        {
          name: "feature-old",
          tip: "f1",
          isHead: false,
          isRemote: false,
          lastCommitDate: "2026-01-01T00:00:00Z",
        },
        {
          name: "feature-new",
          tip: "f2",
          isHead: false,
          isRemote: false,
          lastCommitDate: "2026-01-02T00:00:00Z",
        },
        {
          name: "origin/main",
          tip: "h1",
          isHead: false,
          isRemote: true,
          lastCommitDate: "2026-01-03T00:00:00Z",
        },
        {
          name: "upstream/release",
          tip: "r1",
          isHead: false,
          isRemote: true,
          lastCommitDate: "2026-01-02T00:00:00Z",
        },
      ],
      tags: [{ name: "v1.0", target: "t1", annotated: false }],
      stashes: [],
    };

    const result = allocateLanes(refs, refs.head);

    const names = result.orderedRefs.map((r) => r.name);
    expect(names[0]).toBe("main"); // head
    // locals newer-first
    expect(names.indexOf("feature-new")).toBeLessThan(names.indexOf("feature-old"));
    // remote-tracking (origin/main has matching local main) before other-remote upstream/release
    expect(names.indexOf("origin/main")).toBeLessThan(names.indexOf("upstream/release"));
    // tags last
    expect(names.indexOf("v1.0")).toBeGreaterThan(names.indexOf("upstream/release"));
  });

  it("reserves lane 0 for the HEAD commit", () => {
    const refs: GitRefsSnapshot = {
      head: head("main", "h1"),
      branches: [
        {
          name: "main",
          tip: "h1",
          isHead: true,
          isRemote: false,
          lastCommitDate: "2026-01-03T00:00:00Z",
        },
        {
          name: "feat",
          tip: "f1",
          isHead: false,
          isRemote: false,
          lastCommitDate: "2026-01-02T00:00:00Z",
        },
      ],
      tags: [],
      stashes: [],
    };

    const result = allocateLanes(refs, refs.head);
    expect(result.tipLanes.get("h1")).toBe(0);
    expect(result.tipLanes.get("f1")).toBe(1);
  });

  it("does not allocate tipLane for a duplicate commit hash from a lower-priority ref", () => {
    const refs: GitRefsSnapshot = {
      head: head("main", "h1"),
      branches: [
        {
          name: "main",
          tip: "h1",
          isHead: true,
          isRemote: false,
          lastCommitDate: "2026-01-03T00:00:00Z",
        },
        {
          name: "origin/main",
          tip: "h1",
          isHead: false,
          isRemote: true,
          lastCommitDate: "2026-01-03T00:00:00Z",
        },
      ],
      tags: [],
      stashes: [],
    };

    const result = allocateLanes(refs, refs.head);
    expect(result.tipLanes.size).toBe(1);
    expect(result.tipLanes.get("h1")).toBe(0);
  });

  it("handles detached HEAD by adding synthetic HEAD ref", () => {
    const refs: GitRefsSnapshot = {
      head: head(undefined, "abc123"),
      branches: [],
      tags: [],
      stashes: [],
    };
    const result = allocateLanes(refs, refs.head);
    expect(result.orderedRefs[0]?.name).toBe("HEAD");
    expect(result.tipLanes.get("abc123")).toBe(0);
  });
});
