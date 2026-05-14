import { rollingAlgorithm, type GraphRow as GraphRowType } from "@/graph";
import type { GitCommitSummary } from "@git-viz/shared";
import type { ExpandedState } from "@tanstack/react-table";
import React, { useMemo } from "react";
import { GraphRow } from "./GraphRow";

interface CommitGraphProps {
  commits: GitCommitSummary[];
  rowHeight?: number;
  expandedRows?: ExpandedState;
  detailHeight?: number;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  rowHeight = 24,
  expandedRows = {},
  detailHeight = 256,
}) => {
  const laneWidth = 20;
  const { rows, width } = useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight, laneWidth });
    const w = result.laneCount * laneWidth + 40;
    return { rows: result.rows as GraphRowType[], width: w };
  }, [commits, rowHeight, laneWidth]);

  const rowPositions = useMemo(() => {
    let currentY = 0;
    return rows.map((row) => {
      const isExpanded = (expandedRows as Record<string, boolean>)[row.commit.hash];
      const y = currentY;
      const height = rowHeight + (isExpanded ? detailHeight : 0);
      currentY += height;
      return { y, height, isExpanded };
    });
  }, [rows, expandedRows, rowHeight, detailHeight]);

  const totalHeight =
    rowPositions.length > 0
      ? rowPositions[rowPositions.length - 1].y + rowPositions[rowPositions.length - 1].height
      : 0;

  return (
    <svg
      width={width}
      height={totalHeight}
      className="block"
      style={{ minWidth: width, minHeight: totalHeight }}
    >
      {rows.map((row, index) => {
        const { y, height } = rowPositions[index];
        return (
          <g key={row.commit.hash} transform={`translate(0, ${y})`}>
            <GraphRow row={row} rowHeight={rowHeight} totalHeight={height} laneWidth={laneWidth} />
          </g>
        );
      })}
    </svg>
  );
};
