import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: linear DAG", () => {
  it("produces a single lane with one shared color", () => {
    const { commits, refs, head } = buildDag()
      .commit("e")
      .refs("main", "HEAD")
      .parent("d")
      .commit("d")
      .parent("c")
      .commit("c")
      .parent("b")
      .commit("b")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });

    expect(result.rows).toHaveLength(5);
    expect(result.laneCount).toBe(1);
    for (const row of result.rows) {
      expect(row.nodeColumn).toBe(0);
    }
    const colors = new Set(result.rows.map((r) => r.commit.color));
    expect(colors.size).toBe(1);
  });

  it("HEAD commit gets kind 'HEAD'", () => {
    const { commits, refs, head } = buildDag()
      .commit("b")
      .refs("main", "HEAD")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    expect(result.rows[0].kind).toBe("HEAD");
    expect(result.rows[1].kind).toBe("node");
  });
});
