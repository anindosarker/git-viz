import type React from "react";
import type { GraphRow } from "../types";

export type ColumnId =
  | "refs"
  | "graph"
  | "subject"
  | "author"
  | "authorAvatar"
  | "changes"
  | "date"
  | "hash"
  | "sha";

export interface ColumnConfig {
  id: ColumnId;
  visible: boolean;
  width: number | "flex";
  refsInline?: boolean;
}

export interface ColumnContext {
  dateFormat?: string;
  [key: string]: unknown;
}

export interface ColumnRendererProps {
  row: GraphRow;
  context: ColumnContext;
}

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  defaultWidth: number | "flex";
  Component: React.FC<ColumnRendererProps>;
}
