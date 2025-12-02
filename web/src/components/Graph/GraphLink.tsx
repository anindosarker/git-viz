import React from "react";
import type { GraphLink as GraphLinkType } from "../../utils/graph";

interface GraphLinkProps {
  link: GraphLinkType;
}

export const GraphLink: React.FC<GraphLinkProps> = ({ link }) => {
  // Calculate Bezier curve path
  // Start: (x1, y1) -> End: (x2, y2)
  // Standard git graph curve: M x1 y1 C x1 yMid, x2 yMid, x2 y2

  const yMid = (link.y1 + link.y2) / 2;
  const path = `M ${link.x1} ${link.y1} C ${link.x1} ${yMid}, ${link.x2} ${yMid}, ${link.x2} ${link.y2}`;

  return (
    <path
      d={path}
      stroke={link.color}
      strokeWidth={2}
      fill="none"
      opacity={0.8}
      className="graph-link"
    />
  );
};
