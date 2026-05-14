import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: single merge", () => {
  it("opens a second lane for the feature branch and closes it after the fork", () => {
    // topo order (newest first):
    //   m (merge of d, c)  — main/HEAD
    //   d (parent: b)
    //   c (parent: b)     — feature
    //   b (parent: a)
    //   a
    const { commits, refs, head } = buildDag()
      .commit("m")
      .refs("main", "HEAD")
      .parents("d", "c")
      .commit("d")
      .parent("b")
      .commit("c")
      .refs("feature")
      .parent("b")
      .commit("b")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });

    expect(result.rows).toHaveLength(5);
    // Merge row outputs two lanes
    expect(result.rows[0].outputSwimlanes).toHaveLength(2);
    expect(result.laneCount).toBeGreaterThanOrEqual(2);

    // Merge parents get distinct colors
    const mergeColors = new Set(result.rows[0].outputSwimlanes.map((s) => s.color));
    expect(mergeColors.size).toBe(2);

    // HEAD commit on lane 0
    expect(result.rows[0].nodeColumn).toBe(0);
    expect(result.rows[0].kind).toBe("HEAD");

    // The 'c' (feature tip) commit should be on a lane > 0 (not the HEAD chain)
    const cRow = result.rows.find((r) => r.commit.hash === "c");
    expect(cRow).toBeDefined();
    if (cRow) expect(cRow.nodeColumn).toBeGreaterThan(0);
  });

  it("HEAD chain commits share one color, feature lane has a different color", () => {
    const { commits, refs, head } = buildDag()
      .commit("m")
      .refs("main", "HEAD")
      .parents("d", "c")
      .commit("d")
      .parent("b")
      .commit("c")
      .refs("feature")
      .parent("b")
      .commit("b")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const m = result.rows.find((r) => r.commit.hash === "m");
    const d = result.rows.find((r) => r.commit.hash === "d");
    const c = result.rows.find((r) => r.commit.hash === "c");
    expect(m?.commit.color).toBe(d?.commit.color);
    expect(m?.commit.color).not.toBe(c?.commit.color);
  });
});
