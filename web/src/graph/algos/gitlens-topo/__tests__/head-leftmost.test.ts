import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: HEAD-leftmost", () => {
  it("places HEAD branch tip at lane 0 even when it is the older branch", () => {
    // 'feature' has newer date than 'main', but main is HEAD.
    // topo order: m (newest by topo), n (feature tip newer date), o (older)
    const { commits, refs, head } = buildDag()
      .commit("m")
      .refs("main", "HEAD")
      .date("2026-01-01T00:00:00Z")
      .parent("o")
      .commit("n")
      .refs("feature")
      .date("2026-01-02T00:00:00Z")
      .parent("o")
      .commit("o")
      .build();

    // Override head to main (older date) explicitly via builder.
    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const mRow = result.rows.find((r) => r.commit.hash === "m");
    expect(mRow).toBeDefined();
    if (mRow) {
      expect(mRow.nodeColumn).toBe(0);
      expect(mRow.kind).toBe("HEAD");
    }
    // feature should be on lane > 0
    const nRow = result.rows.find((r) => r.commit.hash === "n");
    expect(nRow).toBeDefined();
    if (nRow) expect(nRow.nodeColumn).toBeGreaterThan(0);
  });

  it("keeps HEAD chain on lane 0 through multiple commits", () => {
    const { commits, refs, head } = buildDag()
      .commit("h3")
      .refs("main", "HEAD")
      .parent("h2")
      .commit("h2")
      .parent("h1")
      .commit("h1")
      .parent("root")
      .commit("feat-tip")
      .refs("feature")
      .parent("root")
      .commit("root")
      .build();

    const result = gitlensTopoAlgorithm.compute({ commits, refs, head });
    // h3, h2, h1 all on head chain → all lane 0
    expect(result.rows.find((r) => r.commit.hash === "h3")?.nodeColumn).toBe(0);
    expect(result.rows.find((r) => r.commit.hash === "h2")?.nodeColumn).toBe(0);
    expect(result.rows.find((r) => r.commit.hash === "h1")?.nodeColumn).toBe(0);
  });
});
