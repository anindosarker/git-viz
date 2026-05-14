import type { GitFileChange } from "@git-viz/shared";
import React from "react";

interface FileChangeRowProps {
  file: GitFileChange;
  onClick: (file: GitFileChange) => void;
  style?: React.CSSProperties;
}

const STATUS_META: Record<GitFileChange["status"], { label: string; color: string }> = {
  A: { label: "A", color: "var(--gitviz-add-fg)" },
  M: { label: "M", color: "var(--gitviz-mod-fg)" },
  D: { label: "D", color: "var(--gitviz-del-fg)" },
  R: { label: "R", color: "var(--gitviz-rename-fg)" },
  C: { label: "C", color: "var(--vscode-charts-purple)" },
  T: { label: "T", color: "var(--vscode-charts-blue)" },
};

export const FileChangeRow: React.FC<FileChangeRowProps> = ({ file, onClick, style }) => {
  const meta = STATUS_META[file.status] ?? STATUS_META.M;
  const path = file.status === "R" && file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;
  return (
    <button
      type="button"
      onClick={() => onClick(file)}
      className="flex items-center gap-2 w-full text-left px-3 py-1 hover:bg-muted/50 text-xs font-mono focus:bg-muted/50 focus:outline-none"
      style={style}
      title={path}
    >
      <span className="w-4 text-center font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
      <span className="truncate grow">{path}</span>
      <span className="tabular-nums shrink-0" style={{ color: "var(--gitviz-add-fg)" }}>
        +{file.insertions}
      </span>
      <span className="tabular-nums shrink-0" style={{ color: "var(--gitviz-del-fg)" }}>
        −{file.deletions}
      </span>
    </button>
  );
};
