import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: octopus merge", () => {
  it("emits one swimlane per parent at an octopus merge", () => {
    const { commits, refs, head } = buildDag()
      .commit("oct")
      .refs("main", "HEAD")
      .parents("p1", "p2", "p3")
      .commit("p1")
      .commit("p2")
      .commit("p3")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const octRow = result.rows.find((r) => r.commit.hash === "oct");
    expect(octRow).toBeDefined();
    if (octRow) {
      const ids = new Set(octRow.outputSwimlanes.map((s) => s.id).filter(Boolean));
      expect(ids.has("p1")).toBe(true);
      expect(ids.has("p2")).toBe(true);
      expect(ids.has("p3")).toBe(true);
      // Distinct colors for each parent lane
      const colors = new Set(octRow.outputSwimlanes.map((s) => s.color));
      expect(colors.size).toBeGreaterThanOrEqual(3);
    }
  });

  it("HEAD-chain parent stays on lane 0 across an octopus", () => {
    const { commits, refs, head } = buildDag()
      .commit("oct")
      .refs("main", "HEAD")
      .parents("p1", "p2", "p3")
      .commit("p1")
      .parent("root")
      .commit("p2")
      .commit("p3")
      .commit("root")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    expect(result.rows.find((r) => r.commit.hash === "oct")?.nodeColumn).toBe(0);
    // First parent (head chain) should be on lane 0 in output
    const octRow = result.rows.find((r) => r.commit.hash === "oct");
    if (octRow) expect(octRow.outputSwimlanes[0]?.id).toBe("p1");
  });
});
