import type { GitCommit } from "@/types/git";
import React, { useMemo } from "react";
import { calculateGraph } from "../../utils/graph";
import { GraphRow } from "./GraphRow";

interface CommitGraphProps {
  commits: GitCommit[];
  rowHeight?: number;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  rowHeight = 24,
}) => {
  const { rows, height, width } = useMemo(
    () => calculateGraph(commits, rowHeight),
    [commits, rowHeight]
  );

  return (
    <svg
      width={width}
      height={height}
      className="block"
      style={{ minWidth: width, minHeight: height }}
    >
      {rows.map((row, index) => (
        <g
          key={row.commit.hash}
          transform={`translate(0, ${index * rowHeight})`}
        >
          <GraphRow row={row} rowHeight={rowHeight} laneWidth={20} />
        </g>
      ))}
    </svg>
  );
};
