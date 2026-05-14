import { getAlgorithm, rollingAlgorithm } from "@/graph";
import { joinCommits } from "@/graph/join";
import { useMemo } from "react";
import { useStore } from "@/state/store";

interface UseGraphOptions {
  rowHeight?: number;
  laneWidth?: number;
  workingTreeDirty?: boolean;
}

export const useGraph = (options: UseGraphOptions = {}) => {
  const { laneWidth = 24 } = options;
  const commits = useStore((s) => s.commits);
  const refs = useStore((s) => s.refs);
  const presetRowHeight = useStore((s) => s.rowHeight);
  const algorithmId = useStore((s) => s.algorithmId);
  const rowHeight = options.rowHeight ?? presetRowHeight;
  const workingTreeDirty = options.workingTreeDirty ?? false;

  return useMemo(() => {
    const joined = joinCommits({
      commits,
      refs,
      head: refs?.head,
      workingTreeDirty,
    });

    const algo = getAlgorithm(algorithmId) ?? rollingAlgorithm;
    const result = algo.compute({
      commits: joined.map((j) => j.commit),
      refs,
      head: refs?.head,
      rowHeight,
      laneWidth,
    });

    // Stamp kind from join onto each row
    const rows = result.rows.map((row, i) => ({
      ...row,
      kind: joined[i]?.kind ?? row.kind,
      commit: { ...row.commit, refs: joined[i]?.commit.refs ?? [] },
    }));

    return {
      rows,
      laneCount: result.laneCount,
      height: rows.length * rowHeight,
      width: result.laneCount * laneWidth + laneWidth,
    };
  }, [commits, refs, rowHeight, laneWidth, algorithmId, workingTreeDirty]);
};
