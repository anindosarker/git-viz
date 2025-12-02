import type { GitCommit } from "@/types/git";
import React, { useMemo } from "react";
import { calculateGraph } from "../../utils/graph";

interface CommitGraphProps {
  commits: GitCommit[];
}

export const CommitGraph: React.FC<CommitGraphProps> = ({ commits }) => {
  const rowHeight = 24;
  const laneWidth = 20;

  const { nodes, links, width, height } = useMemo(() => {
    return calculateGraph(commits, rowHeight, laneWidth);
  }, [commits]);

  return (
    <svg width={width} height={height} className="block">
      {links.map((link, i) => {
        // Create a bezier curve
        // Start: (x1, y1) -> End: (x2, y2)
        // Control points: (x1, y2) and (x2, y1) ? Or simpler vertical curve?
        // Standard git graph curve:
        // M x1 y1 C x1 yMid, x2 yMid, x2 y2

        const yMid = (link.y1 + link.y2) / 2;
        // If changing lanes, curve. If same lane, straight line.
        const path = `M ${link.x1} ${link.y1} C ${link.x1} ${yMid}, ${link.x2} ${yMid}, ${link.x2} ${link.y2}`;

        return (
          <path
            key={`link-${i}`}
            d={path}
            stroke={link.color}
            strokeWidth={2}
            fill="none"
            opacity={0.8}
          />
        );
      })}
      {nodes.map((node) => (
        <g key={node.hash}>
          <circle
            cx={node.x}
            cy={node.y}
            r={4}
            fill={node.color}
            stroke="#fff"
            strokeWidth={1}
          />
        </g>
      ))}
    </svg>
  );
};
