import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: lane reuse", () => {
  it("reuses a dropped lane index for a later-appearing branch", () => {
    // topo order (newest first):
    //   z   — main/HEAD (parent: y)
    //   y   — parent: a (head chain)
    //   x   — feature-b tip (parent: w)  (born after old-feat died)
    //   w   — parent: a
    //   c   — old-feat tip (rootless: no parents)
    //   a   — parent: (none) — old root for main
    //
    // Goal: 'c' dies (no parents) at row index 4. Then 'x' (feature-b) appears
    // and should reuse lane 1 instead of going to lane 2.
    const { commits, refs, head } = buildDag()
      .commit("z")
      .refs("main", "HEAD")
      .parent("y")
      .commit("y")
      .parent("a")
      .commit("x")
      .refs("feature-b")
      .parent("w")
      .commit("w")
      .parent("a")
      .commit("c")
      .refs("old-feat")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });

    // 'x' (feature-b tip) row — find its nodeColumn
    const xRow = result.rows.find((r) => r.commit.hash === "x");
    expect(xRow).toBeDefined();
    // After 'c' dies, lane 1 should be free for x. Lane count overall should be <= 2.
    expect(result.laneCount).toBeLessThanOrEqual(2);
    if (xRow) {
      expect(xRow.nodeColumn).toBeLessThanOrEqual(1);
    }
  });

  it("does not pass through a dead lane after a no-parent commit", () => {
    const { commits, refs, head } = buildDag()
      .commit("z")
      .refs("main", "HEAD")
      .parent("y")
      .commit("y")
      .commit("orphan")
      .refs("dead-branch")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const orphanRow = result.rows.find((r) => r.commit.hash === "orphan");
    expect(orphanRow).toBeDefined();
    // orphan has no parents → its lane should NOT propagate forward
    if (orphanRow) {
      expect(orphanRow.outputSwimlanes.some((s) => s.id === "orphan")).toBe(false);
    }
  });
});
