import type { GitCommitSummary, GitRefPointer } from "@git-viz/shared";

export type GraphRowKind = "HEAD" | "node" | "working-tree" | "stash" | "incoming" | "outgoing";

export interface GraphNode {
  id: string;
  color: string;
}

export interface CommitRow extends GitCommitSummary {
  color?: string;
  authorAvatar?: string;
  refs: GitRefPointer[];
  kind?: GraphRowKind;
}

export interface GraphRow {
  kind: GraphRowKind;
  commit: CommitRow;
  inputSwimlanes: GraphNode[];
  outputSwimlanes: GraphNode[];
  nodeColumn: number;
  metadata?: Record<string, unknown>;
}

export interface GraphData {
  rows: GraphRow[];
  height: number;
  width: number;
  laneCount: number;
}
