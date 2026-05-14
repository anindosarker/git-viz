import type { GitCommitSummary, GitRefPointer } from "@git-viz/shared";

export type GraphRowKind = "HEAD" | "node" | "working-tree" | "stash" | "incoming" | "outgoing";

export interface GraphNode {
  id: string;
  color: string;
}

export interface CommitRow extends GitCommitSummary {
  refs: GitRefPointer[];
  color?: string;
  authorAvatar?: string;
}

export interface GraphRow {
  kind: GraphRowKind;
  commit: CommitRow;
  inputSwimlanes: GraphNode[];
  outputSwimlanes: GraphNode[];
  nodeColumn: number;
  metadata?: Record<string, unknown>;
}
