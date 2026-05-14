import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: color stability", () => {
  it("keeps the same color on every row of a single-branch first-parent chain", () => {
    const { commits, refs, head } = buildDag()
      .commit("c5")
      .refs("main", "HEAD")
      .parent("c4")
      .commit("c4")
      .parent("c3")
      .commit("c3")
      .parent("c2")
      .commit("c2")
      .parent("c1")
      .commit("c1")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const colors = result.rows.map((r) => r.commit.color);
    const unique = new Set(colors);
    expect(unique.size).toBe(1);
  });

  it("preserves a branch's color across pages", () => {
    const { commits, refs, head } = buildDag()
      .commit("m4")
      .refs("main", "HEAD")
      .parent("m3")
      .commit("m3")
      .parent("m2")
      .commit("m2")
      .parent("m1")
      .commit("m1")
      .parent("f0")
      .commit("f0")
      .refs("feat")
      .build();

    const p1 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(0, 2),
      refs,
      head,
    });
    const p2 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(2),
      refs,
      head,
      prevState: p1.state,
    });

    const allRows = [...p1.rows, ...p2.rows];
    // HEAD chain (m1..m4) should all share the head color
    const mainColors = new Set(
      allRows.filter((r) => r.commit.hash.startsWith("m")).map((r) => r.commit.color)
    );
    expect(mainColors.size).toBe(1);
  });
});
