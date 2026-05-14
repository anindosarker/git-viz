import { getAlgorithm, rollingAlgorithm } from "@/graph";
import { useMemo } from "react";
import { useStore } from "../state/store";

interface UseGraphOptions {
  rowHeight?: number;
  laneWidth?: number;
}

export const useGraph = (options: UseGraphOptions = {}) => {
  const { laneWidth = 20 } = options;
  const commits = useStore((s) => s.commits);
  const presetRowHeight = useStore((s) => s.rowHeight);
  const presetId = useStore((s) => s.presetId);
  const rowHeight = options.rowHeight ?? presetRowHeight;

  return useMemo(() => {
    const algo = getAlgorithm(presetId) ?? rollingAlgorithm;
    const result = algo.compute({ commits, rowHeight, laneWidth });
    return {
      rows: result.rows,
      laneCount: result.laneCount,
      height: commits.length * rowHeight,
      width: result.laneCount * laneWidth + 40,
    };
  }, [commits, rowHeight, laneWidth, presetId]);
};
