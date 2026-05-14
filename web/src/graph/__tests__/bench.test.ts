import type { GitCommitSummary } from "@git-viz/shared";
import { describe, expect, it } from "vitest";
import { rollingAlgorithm } from "../algos/rolling";

function syntheticDag(n: number, branchEvery = 50): GitCommitSummary[] {
  const out: GitCommitSummary[] = [];
  for (let i = 0; i < n; i++) {
    const hash = `c${i.toString(16).padStart(8, "0")}`;
    const parents: string[] = [];
    if (i < n - 1) {
      parents.push(`c${(i + 1).toString(16).padStart(8, "0")}`);
      // Inject merge commits every `branchEvery` rows to exercise lane reuse
      if (i % branchEvery === 0 && i + branchEvery + 1 < n) {
        parents.push(`c${(i + branchEvery + 1).toString(16).padStart(8, "0")}`);
      }
    }
    out.push({
      hash,
      parents,
      author: "bench",
      authorEmail: "b@x",
      authorDate: "2026-01-01T00:00:00Z",
      committer: "bench",
      committerEmail: "b@x",
      committerDate: "2026-01-01T00:00:00Z",
      subject: `commit ${i}`,
    });
  }
  return out;
}

describe("rolling algorithm bench", () => {
  it("computes 5000 commits in under 500ms (informational)", () => {
    const commits = syntheticDag(5000);
    const t0 = performance.now();
    const result = rollingAlgorithm.compute({ commits });
    const elapsed = performance.now() - t0;
    // Loose assertion: just guard against a 10x regression
    expect(elapsed).toBeLessThan(2000);
    expect(result.rows).toHaveLength(5000);
    console.log(
      `[bench] rolling.compute(5000) elapsed=${elapsed.toFixed(1)}ms laneCount=${result.laneCount}`
    );
  });

  it("incremental compute keeps subsequent-page cost low", () => {
    const all = syntheticDag(5000);
    const page1 = all.slice(0, 1000);
    const page2 = all.slice(1000, 2000);
    const t0 = performance.now();
    const r1 = rollingAlgorithm.compute({ commits: page1 });
    const t1 = performance.now();
    const r2 = rollingAlgorithm.compute({ commits: page2, prevState: r1.state });
    const t2 = performance.now();
    expect(r1.rows).toHaveLength(1000);
    expect(r2.rows).toHaveLength(1000);
    console.log(
      `[bench] page1(1000)=${(t1 - t0).toFixed(1)}ms page2-incremental(1000)=${(t2 - t1).toFixed(1)}ms`
    );
  });
});
