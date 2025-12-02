import type { GitCommit } from "@/types/git";
import { useMemo } from "react";
import { calculateGraph } from "../utils/graph";

interface UseGraphOptions {
  rowHeight?: number;
  laneWidth?: number;
}

export const useGraph = (
  commits: GitCommit[],
  options: UseGraphOptions = {}
) => {
  const { rowHeight = 24, laneWidth = 20 } = options;

  const graphData = useMemo(() => {
    return calculateGraph(commits, rowHeight, laneWidth);
  }, [commits, rowHeight, laneWidth]);

  return graphData;
};
