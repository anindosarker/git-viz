import type { ColumnConfig } from "../columns/types";

export type ViewPresetId = "gitlens-like" | "git-graph-like" | "vscode-scm-graph-like";

export type RefDisplay = "inline" | "left-column" | "right-column";

export interface ViewPreset {
  id: ViewPresetId;
  label: string;
  algorithmId: string;
  rendererId: string;
  defaultColumns: ColumnConfig[];
  defaultRefDisplay: RefDisplay;
  defaultRowHeight: number;
}
