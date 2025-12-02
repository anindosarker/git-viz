import type { GitCommit } from "@/types/git";
import React from "react";
import { useGraph } from "../../hooks/useGraph.hook";
import { GraphLink } from "./GraphLink";
import { GraphNode } from "./GraphNode";

interface CommitGraphProps {
  commits: GitCommit[];
  rowHeight?: number;
  laneWidth?: number;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  rowHeight = 24,
  laneWidth = 20,
}) => {
  const { nodes, links, width, height } = useGraph(commits, {
    rowHeight,
    laneWidth,
  });

  return (
    <svg width={width} height={height} className="block">
      <g className="links">
        {links.map((link, i) => (
          <GraphLink key={`link-${i}`} link={link} />
        ))}
      </g>
      <g className="nodes">
        {nodes.map((node) => (
          <GraphNode key={node.hash} node={node} />
        ))}
      </g>
    </svg>
  );
};
