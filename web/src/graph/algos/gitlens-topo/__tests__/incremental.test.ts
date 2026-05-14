import type { GraphRow } from "../../../types";
import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

function laneIds(row: GraphRow): string[] {
  return row.outputSwimlanes.map((s) => s.id);
}

function laneColors(row: GraphRow): string[] {
  return row.outputSwimlanes.map((s) => s.color);
}

describe("gitlens-topo: incremental equivalence", () => {
  it("computes the same rows as a full pass on a linear chain split into two pages", () => {
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

    const full = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const p1 = gitlensTopoAlgorithm.compute({ commits: commits.slice(0, 2), refs, head });
    const p2 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(2),
      refs,
      head,
      prevState: p1.state,
    });

    const incremental = [...p1.rows, ...p2.rows];
    expect(incremental).toHaveLength(full.rows.length);
    for (let i = 0; i < full.rows.length; i++) {
      expect(incremental[i].commit.hash).toBe(full.rows[i].commit.hash);
      expect(incremental[i].nodeColumn).toBe(full.rows[i].nodeColumn);
      expect(incremental[i].commit.color).toBe(full.rows[i].commit.color);
      expect(laneIds(incremental[i])).toEqual(laneIds(full.rows[i]));
      expect(laneColors(incremental[i])).toEqual(laneColors(full.rows[i]));
    }
  });

  it("preserves equivalence across a merge boundary (split mid-merge)", () => {
    const { commits, refs, head } = buildDag()
      .commit("h")
      .refs("main", "HEAD")
      .parent("g")
      .commit("g")
      .parent("m")
      .commit("m")
      .parents("a", "b")
      .commit("a")
      .parent("root")
      .commit("b")
      .refs("feat")
      .parent("root")
      .commit("root")
      .build();

    const full = gitlensTopoAlgorithm.compute({ commits, refs, head });
    const p1 = gitlensTopoAlgorithm.compute({ commits: commits.slice(0, 2), refs, head });
    const p2 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(2, 4),
      refs,
      head,
      prevState: p1.state,
    });
    const p3 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(4),
      refs,
      head,
      prevState: p2.state,
    });

    const incremental = [...p1.rows, ...p2.rows, ...p3.rows];
    for (let i = 0; i < full.rows.length; i++) {
      expect(incremental[i].commit.color).toBe(full.rows[i].commit.color);
      expect(incremental[i].nodeColumn).toBe(full.rows[i].nodeColumn);
      expect(laneIds(incremental[i])).toEqual(laneIds(full.rows[i]));
    }
  });

  it("seeded random DAGs: incremental == full across many page splits", () => {
    // Generate a few deterministic DAG shapes via seeded RNG.
    const rng = (() => {
      let s = 0x12345678;
      return () => {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 1000) / 1000;
      };
    })();

    for (let trial = 0; trial < 5; trial++) {
      const builder = buildDag();
      const N = 12;
      // Build chain of N commits with occasional merges into a 'side' branch.
      const hashes: string[] = [];
      for (let i = 0; i < N; i++) {
        const h = `t${trial}-${i}`;
        hashes.push(h);
      }
      // newest first
      for (let i = 0; i < N; i++) {
        const h = hashes[i];
        const c = builder.commit(h);
        if (i === 0) c.refs("main", "HEAD");
        if (i === Math.floor(N / 2)) c.refs("side");
        if (i < N - 1) {
          if (i % 3 === 0 && i + 2 < N && rng() < 0.5) {
            c.parents(hashes[i + 1], hashes[i + 2]);
          } else {
            c.parent(hashes[i + 1]);
          }
        }
      }
      const { commits, refs, head } = builder.build();

      const full = gitlensTopoAlgorithm.compute({ commits, refs, head });

      // Try splitting at every boundary
      for (let split = 1; split < commits.length; split++) {
        const p1 = gitlensTopoAlgorithm.compute({
          commits: commits.slice(0, split),
          refs,
          head,
        });
        const p2 = gitlensTopoAlgorithm.compute({
          commits: commits.slice(split),
          refs,
          head,
          prevState: p1.state,
        });
        const incremental = [...p1.rows, ...p2.rows];
        expect(incremental).toHaveLength(full.rows.length);
        for (let i = 0; i < full.rows.length; i++) {
          expect(incremental[i].commit.hash).toBe(full.rows[i].commit.hash);
          expect(incremental[i].nodeColumn).toBe(full.rows[i].nodeColumn);
          expect(laneIds(incremental[i])).toEqual(laneIds(full.rows[i]));
        }
      }
    }
  });
});
