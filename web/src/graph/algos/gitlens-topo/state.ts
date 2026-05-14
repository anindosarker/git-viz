import type { GitHeadState, GitRefsSnapshot } from "@git-viz/shared";
import type { GraphNode } from "../../types";
import type { ComputeState } from "../types";
import { allocateLanes, type TipAllocation } from "./allocate";

export interface GitLensTopoState {
  __algo: "gitlens-topo";
  outputSwimlanes: GraphNode[];
  /** ref.name → color (stable across pages) */
  colorMap: Map<string, string>;
  /** commit hash → reserved lane index for branch tips not yet visited */
  tipLanes: Map<string, number>;
  /** unsorted refs by commit hash, used for color lookups during walk */
  refsByCommit: Map<string, string[]>;
  headBranchName?: string;
  headCommit: string;
  maxLanesSeen: number;
  /** has the working-tree pseudo-row already been emitted? */
  workingTreeEmitted: boolean;
}

export function isGitLensTopoState(s: ComputeState | undefined): s is GitLensTopoState {
  return !!s && typeof s === "object" && (s as { __algo?: string }).__algo === "gitlens-topo";
}

export function initialState(
  refs: GitRefsSnapshot | undefined,
  head: GitHeadState | undefined
): GitLensTopoState {
  const alloc = allocateLanes(refs, head);
  const refsByCommit = buildRefsByCommit(alloc);
  return {
    __algo: "gitlens-topo",
    outputSwimlanes: [],
    colorMap: alloc.colorMap,
    tipLanes: alloc.tipLanes,
    refsByCommit,
    headBranchName: alloc.headBranchName,
    headCommit: alloc.headCommit,
    maxLanesSeen: 0,
    workingTreeEmitted: false,
  };
}

export function cloneState(s: GitLensTopoState): GitLensTopoState {
  return {
    __algo: "gitlens-topo",
    outputSwimlanes: s.outputSwimlanes.map((n) => ({ ...n })),
    colorMap: new Map(s.colorMap),
    tipLanes: new Map(s.tipLanes),
    refsByCommit: new Map(Array.from(s.refsByCommit, ([k, v]) => [k, [...v]])),
    headBranchName: s.headBranchName,
    headCommit: s.headCommit,
    maxLanesSeen: s.maxLanesSeen,
    workingTreeEmitted: s.workingTreeEmitted,
  };
}

function buildRefsByCommit(alloc: TipAllocation): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const ref of alloc.orderedRefs) {
    const arr = m.get(ref.commitHash) ?? [];
    arr.push(ref.name);
    m.set(ref.commitHash, arr);
  }
  return m;
}
