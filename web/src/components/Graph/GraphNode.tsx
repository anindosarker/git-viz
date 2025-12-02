import React from "react";
import type { GraphNode as GraphNodeType } from "../../utils/graph";
import { getInitials } from "../../utils/string";

interface GraphNodeProps {
  node: GraphNodeType;
}

export const GraphNode: React.FC<GraphNodeProps> = ({ node }) => {
  const radius = 9; // Increased radius for avatar
  const fontSize = 8;

  return (
    <g className="graph-node">
      {/* Outer border/ring */}
      <circle cx={node.x} cy={node.y} r={radius + 1} fill={node.color} />
      {/* Inner background */}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill="#ffffff" // White background for text
      />
      {/* Initials */}
      <text
        x={node.x}
        y={node.y}
        dy="0.35em"
        textAnchor="middle"
        fontSize={fontSize}
        fill={node.color} // Text color matches graph color
        fontWeight="bold"
        fontFamily="monospace"
        pointerEvents="none"
      >
        {getInitials(node.author)}
      </text>
    </g>
  );
};
