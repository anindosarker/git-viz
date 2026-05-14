import type { GitCommitSummary } from "@git-viz/shared";
import { describe, expect, it } from "vitest";
import { rollingAlgorithm } from "../rolling";

function c(hash: string, parents: string[] = []): GitCommitSummary {
  return {
    hash,
    parents,
    author: "a",
    authorEmail: "a@x",
    authorDate: "2026-01-01T00:00:00Z",
    committer: "a",
    committerEmail: "a@x",
    committerDate: "2026-01-01T00:00:00Z",
    subject: hash,
  };
}

describe("rolling algorithm", () => {
  it("computes a linear DAG with a single lane", () => {
    const commits = [c("a", ["b"]), c("b", ["c"]), c("c", [])];
    const result = rollingAlgorithm.compute({ commits });

    expect(result.rows).toHaveLength(3);
    expect(result.laneCount).toBe(1);
    expect(result.rows[0].nodeColumn).toBe(0);
    expect(result.rows[1].nodeColumn).toBe(0);
    expect(result.rows[2].nodeColumn).toBe(0);
    // First-parent chain shares a single color
    const color = result.rows[0].commit.color;
    expect(result.rows[1].commit.color).toBe(color);
    expect(result.rows[2].commit.color).toBe(color);
  });

  it("handles a single merge commit by emitting two output lanes", () => {
    //   m
    //  / \
    // a   b
    const commits = [c("m", ["a", "b"]), c("a", []), c("b", [])];
    const result = rollingAlgorithm.compute({ commits });

    expect(result.rows).toHaveLength(3);
    // First row has merge output (2 lanes)
    expect(result.rows[0].outputSwimlanes).toHaveLength(2);
    // laneCount must be at least 2
    expect(result.laneCount).toBeGreaterThanOrEqual(2);
    // Merge parents get distinct colors
    const colors = new Set(result.rows[0].outputSwimlanes.map((s) => s.color));
    expect(colors.size).toBe(2);
  });

  it("yields incremental == full compute (linear chain)", () => {
    const all = [c("a", ["b"]), c("b", ["c"]), c("c", ["d"]), c("d", [])];
    const full = rollingAlgorithm.compute({ commits: all });

    const page1 = rollingAlgorithm.compute({ commits: all.slice(0, 2) });
    const page2 = rollingAlgorithm.compute({
      commits: all.slice(2),
      prevState: page1.state,
    });

    const incrementalRows = [...page1.rows, ...page2.rows];
    expect(incrementalRows).toHaveLength(full.rows.length);
    for (let i = 0; i < full.rows.length; i++) {
      expect(incrementalRows[i].commit.hash).toBe(full.rows[i].commit.hash);
      expect(incrementalRows[i].nodeColumn).toBe(full.rows[i].nodeColumn);
      expect(incrementalRows[i].commit.color).toBe(full.rows[i].commit.color);
      expect(incrementalRows[i].inputSwimlanes.map((s) => s.id)).toEqual(
        full.rows[i].inputSwimlanes.map((s) => s.id)
      );
      expect(incrementalRows[i].outputSwimlanes.map((s) => s.id)).toEqual(
        full.rows[i].outputSwimlanes.map((s) => s.id)
      );
    }
  });

  it("yields incremental == full compute (merge across page boundary)", () => {
    // pages split at index 2 — boundary in middle of merge
    const all = [
      c("h", ["g"]),
      c("g", ["m"]),
      c("m", ["a", "b"]), // merge
      c("a", ["root"]),
      c("b", ["root"]),
      c("root", []),
    ];
    const full = rollingAlgorithm.compute({ commits: all });
    const p1 = rollingAlgorithm.compute({ commits: all.slice(0, 2) });
    const p2 = rollingAlgorithm.compute({ commits: all.slice(2, 4), prevState: p1.state });
    const p3 = rollingAlgorithm.compute({ commits: all.slice(4), prevState: p2.state });

    const merged = [...p1.rows, ...p2.rows, ...p3.rows];
    for (let i = 0; i < full.rows.length; i++) {
      expect(merged[i].commit.color).toBe(full.rows[i].commit.color);
      expect(merged[i].nodeColumn).toBe(full.rows[i].nodeColumn);
      expect(merged[i].outputSwimlanes.map((s) => s.color)).toEqual(
        full.rows[i].outputSwimlanes.map((s) => s.color)
      );
    }
  });

  it("registers itself with id 'rolling'", () => {
    expect(rollingAlgorithm.id).toBe("rolling");
  });
});
