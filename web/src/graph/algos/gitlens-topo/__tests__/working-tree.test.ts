import { describe, expect, it } from "vitest";
import { gitlensTopoAlgorithm } from "../index";
import { buildDag } from "./fixtures/dag-builders";

describe("gitlens-topo: working-tree + HEAD kinds", () => {
  it("prepends a working-tree row when workingTree.dirty is true", () => {
    const { commits, refs, head } = buildDag()
      .commit("b")
      .refs("main", "HEAD")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({
      commits,
      refs,
      head,
      workingTree: { dirty: true },
    });

    expect(result.rows[0].kind).toBe("working-tree");
    expect(result.rows[1].kind).toBe("HEAD");
    expect(result.rows[1].commit.hash).toBe("b");
  });

  it("does not prepend a working-tree row when not dirty", () => {
    const { commits, refs, head } = buildDag()
      .commit("b")
      .refs("main", "HEAD")
      .parent("a")
      .commit("a")
      .build();

    const result = gitlensTopoAlgorithm.compute({
      commits,
      refs,
      head,
      workingTree: { dirty: false },
    });

    expect(result.rows[0].kind).toBe("HEAD");
  });

  it("does not re-prepend working-tree row on subsequent pages (prevState present)", () => {
    const { commits, refs, head } = buildDag()
      .commit("b")
      .refs("main", "HEAD")
      .parent("a")
      .commit("a")
      .build();

    const p1 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(0, 1),
      refs,
      head,
      workingTree: { dirty: true },
    });
    const p2 = gitlensTopoAlgorithm.compute({
      commits: commits.slice(1),
      refs,
      head,
      workingTree: { dirty: true },
      prevState: p1.state,
    });

    expect(p1.rows[0].kind).toBe("working-tree");
    // page 2's first row must NOT be working-tree
    expect(p2.rows[0].kind).not.toBe("working-tree");
  });
});
