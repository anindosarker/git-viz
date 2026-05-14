import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: criss-cross merges", () => {
  it("renders two branches that merge each other without crashing or duplicating lanes", () => {
    // Two branches A and B each merge the other's tip.
    //
    //  m1 (main, HEAD)  parents: a2, b2
    //  a2  parents: a1, b1   (A merged B)
    //  b2  parents: b1, a1   (B merged A)
    //  a1  parents: root
    //  b1  parents: root
    //  root
    const { commits, refs, head } = buildDag()
      .commit("m1")
      .refs("main", "HEAD")
      .parents("a2", "b2")
      .commit("a2")
      .parents("a1", "b1")
      .commit("b2")
      .refs("featB")
      .parents("b1", "a1")
      .commit("a1")
      .parent("root")
      .commit("b1")
      .parent("root")
      .commit("root")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    expect(result.rows).toHaveLength(6);

    // No row should have duplicate non-empty swimlane ids
    for (const row of result.rows) {
      const ids = row.outputSwimlanes.map((s) => s.id).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }

    // m1 must be on lane 0 (HEAD)
    expect(result.rows[0].nodeColumn).toBe(0);
  });
});
