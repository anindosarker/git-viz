import type React from "react";
import type { GraphRow } from "../types";

export interface GraphRendererProps {
  rows: GraphRow[];
  rowHeight: number;
  laneWidth: number;
  visibleRange?: { start: number; end: number };
  selectedHash?: string;
  hoveredHash?: string;
  onSelect?: (hash: string) => void;
  onHover?: (hash: string | null) => void;
}

export interface GraphRenderer {
  id: string;
  label: string;
  defaultRowHeight: number;
  defaultLaneWidth: number;
  Component: React.FC<GraphRendererProps>;
}
