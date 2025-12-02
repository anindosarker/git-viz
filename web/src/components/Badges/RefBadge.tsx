import { GitBranch, GitCommitVertical, Tag } from "lucide-react";
import React from "react";

interface RefBadgeProps {
  refName: string;
}

export const RefBadge: React.FC<RefBadgeProps> = ({ refName }) => {
  // Parse ref type and name
  // Examples: "HEAD -> master", "origin/master", "tag: v1.0", "feature/foo"

  let type: "head" | "remote" | "tag" | "branch" = "branch";
  let name = refName;

  if (refName.startsWith("HEAD -> ")) {
    type = "head";
    name = refName.replace("HEAD -> ", "");
  } else if (refName.startsWith("tag: ")) {
    type = "tag";
    name = refName.replace("tag: ", "");
  } else if (refName.includes("/")) {
    type = "remote";
  }

  const getIcon = () => {
    switch (type) {
      case "head":
      case "branch":
      case "remote":
        return <GitBranch className="w-3 h-3 mr-1" />;
      case "tag":
        return <Tag className="w-3 h-3 mr-1" />;
      default:
        return <GitCommitVertical className="w-3 h-3 mr-1" />;
    }
  };

  // Custom colors to match GitLens style (approximate)
  const getStyle = () => {
    switch (type) {
      case "head":
        return {
          backgroundColor: "#007acc",
          color: "white",
          borderColor: "#007acc",
        }; // VS Code Blue
      case "branch":
        return {
          backgroundColor: "#1e1e1e",
          color: "#cccccc",
          borderColor: "#3e3e3e",
          borderWidth: "1px",
        };
      case "remote":
        return {
          backgroundColor: "#1e1e1e",
          color: "#858585",
          borderColor: "#3e3e3e",
          borderWidth: "1px",
          borderStyle: "dashed",
        };
      case "tag":
        return {
          backgroundColor: "#2e2e2e",
          color: "#d7ba7d",
          borderColor: "#d7ba7d",
          borderWidth: "1px",
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-1 mb-1 border"
      style={getStyle()}
    >
      {getIcon()}
      {name}
    </div>
  );
};
