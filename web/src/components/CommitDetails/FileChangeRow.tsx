import type { GitFileChange } from "@git-viz/shared";
import React from "react";

interface FileChangeRowProps {
  file: GitFileChange;
  onClick: (file: GitFileChange) => void;
  style?: React.CSSProperties;
}

const STATUS_META: Record<GitFileChange["status"], { label: string; cls: string }> = {
  A: { label: "A", cls: "text-green-600 dark:text-green-400" },
  M: { label: "M", cls: "text-amber-600 dark:text-amber-400" },
  D: { label: "D", cls: "text-red-600 dark:text-red-400" },
  R: { label: "R", cls: "text-blue-600 dark:text-blue-400" },
  C: { label: "C", cls: "text-purple-600 dark:text-purple-400" },
  T: { label: "T", cls: "text-cyan-600 dark:text-cyan-400" },
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
      <span className={`w-4 text-center font-bold ${meta.cls}`}>{meta.label}</span>
      <span className="truncate grow">{path}</span>
      <span className="text-green-600 dark:text-green-400 tabular-nums shrink-0">
        +{file.insertions}
      </span>
      <span className="text-red-600 dark:text-red-400 tabular-nums shrink-0">
        −{file.deletions}
      </span>
    </button>
  );
};
