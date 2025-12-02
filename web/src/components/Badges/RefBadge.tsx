import { Check, Cloud, Laptop, Tag } from "lucide-react";
import React from "react";

interface RefBadgeProps {
  refName: string;
}

export const RefBadge: React.FC<RefBadgeProps> = ({ refName }) => {
  // Parse ref type and name
  // Examples: "HEAD -> master", "origin/master", "tag: v1.0", "feature/foo"

  let type: "head" | "remote" | "tag" | "branch" = "branch";
  let name = refName;
  let isHead = false;

  if (refName.startsWith("HEAD -> ")) {
    type = "head";
    name = refName.replace("HEAD -> ", "");
    isHead = true;
  } else if (refName.startsWith("tag: ")) {
    type = "tag";
    name = refName.replace("tag: ", "");
  } else if (refName.includes("/")) {
    type = "remote";
  }

  const getIcons = () => {
    const icons = [];
    if (isHead) {
      icons.push(<Check key="check" className="w-3 h-3 mr-1" />);
    }

    switch (type) {
      case "head":
      case "branch":
        icons.push(<Laptop key="laptop" className="w-3 h-3 mr-1" />);
        break;
      case "remote":
        icons.push(<Cloud key="cloud" className="w-3 h-3 mr-1" />);
        break;
      case "tag":
        icons.push(<Tag key="tag" className="w-3 h-3 mr-1" />);
        break;
    }
    return icons;
  };

  // Custom colors to match GitLens style
  const getStyle = () => {
    switch (type) {
      case "head":
      case "branch":
        // Greenish/Teal for local branches
        return {
          backgroundColor: "rgba(20, 80, 70, 0.9)",
          color: "#4db6ac",
          borderColor: "#26a69a",
          borderWidth: "1px",
        };
      case "remote":
        // Blue for remote branches
        return {
          backgroundColor: "rgba(20, 60, 100, 0.9)",
          color: "#64b5f6",
          borderColor: "#42a5f5",
          borderWidth: "1px",
        };
      case "tag":
        // Yellow/Brown for tags
        return {
          backgroundColor: "rgba(80, 70, 20, 0.9)",
          color: "#ffd54f",
          borderColor: "#ffca28",
          borderWidth: "1px",
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border whitespace-nowrap"
      style={getStyle()}
    >
      {getIcons()}
      {name}
    </div>
  );
};
