import { rollingAlgorithm } from "@/graph";
import type { GitCommitSummary } from "@git-viz/shared";
import { useMemo } from "react";

interface UseGraphOptions {
  rowHeight?: number;
  laneWidth?: number;
}

export const useGraph = (commits: GitCommitSummary[], options: UseGraphOptions = {}) => {
  const { rowHeight = 24, laneWidth = 20 } = options;

  return useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight, laneWidth });
    return {
      rows: result.rows,
      height: commits.length * rowHeight,
      width: result.laneCount * laneWidth + 40,
      laneCount: result.laneCount,
    };
  }, [commits, rowHeight, laneWidth]);
};
