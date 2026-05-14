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
    const expandedMap = expandedRows as Record<string, boolean>;
    return rows.reduce<{ y: number; height: number; isExpanded: boolean }[]>((acc, row) => {
      const prev = acc[acc.length - 1];
      const y = prev ? prev.y + prev.height : 0;
      const isExpanded = expandedMap[row.commit.hash];
      const height = rowHeight + (isExpanded ? detailHeight : 0);
      acc.push({ y, height, isExpanded });
      return acc;
    }, []);
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
