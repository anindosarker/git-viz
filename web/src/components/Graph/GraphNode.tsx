import React from "react";
import type { GraphNode as GraphNodeType } from "../../utils/graph";

interface GraphNodeProps {
  node: GraphNodeType;
}

export const GraphNode: React.FC<GraphNodeProps> = ({ node }) => {
  return (
    <g className="graph-node">
      <circle
        cx={node.x}
        cy={node.y}
        r={4}
        fill={node.color}
        stroke="#fff"
        strokeWidth={1}
      />
    </g>
  );
};
