import { getRenderer, rollingAlgorithm } from "@/graph";
import "@/graph/render/hybrid-canvas-wide";
import type { GitCommitSummary } from "@git-viz/shared";
import React, { useMemo } from "react";
import { useStore } from "@/state/store";

interface CommitGraphProps {
  commits: GitCommitSummary[];
  rowHeight?: number;
  visibleRange?: { start: number; end: number };
  onSelect?: (hash: string) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  rowHeight,
  visibleRange,
  onSelect,
}) => {
  const rendererId = useStore((s) => s.rendererId);
  const renderer = getRenderer(rendererId) ?? getRenderer("hybrid-canvas-wide");
  const effectiveRowHeight = rowHeight ?? renderer?.defaultRowHeight ?? 28;
  const laneWidth = renderer?.defaultLaneWidth ?? 24;

  const { rows } = useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight: effectiveRowHeight, laneWidth });
    return { rows: result.rows };
  }, [commits, effectiveRowHeight, laneWidth]);

  if (!renderer) return null;
  const Renderer = renderer.Component;

  return (
    <Renderer
      rows={rows}
      rowHeight={effectiveRowHeight}
      laneWidth={laneWidth}
      visibleRange={visibleRange}
      onSelect={onSelect}
    />
  );
};
