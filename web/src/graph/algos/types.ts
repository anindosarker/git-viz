import type { GitCommitSummary, GitHeadState, GitRefsSnapshot } from "@git-viz/shared";
import type { GraphRow } from "../types";

export interface ComputeInput {
  commits: GitCommitSummary[];
  refs?: GitRefsSnapshot;
  head?: GitHeadState;
  workingTree?: { dirty: boolean };
  prevState?: ComputeState;
  rowHeight?: number;
  laneWidth?: number;
}

export type ComputeState = unknown;

export interface ComputeResult {
  rows: GraphRow[];
  state: ComputeState;
  laneCount: number;
}

export interface GraphAlgorithm {
  id: string;
  label: string;
  description?: string;
  compute(input: ComputeInput): ComputeResult;
}
