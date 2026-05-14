import type { GitFileChange } from "@git-viz/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import React from "react";
import { FileChangeRow } from "./FileChangeRow";

interface FileChangeListProps {
  files?: GitFileChange[];
  truncated: boolean;
  loading: boolean;
  error?: string;
  onOpenFile: (file: GitFileChange) => void;
}

const ROW_HEIGHT = 24;

export const FileChangeList: React.FC<FileChangeListProps> = ({
  files,
  truncated,
  loading,
  error,
  onOpenFile,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const list = files ?? [];
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (loading) {
    return <div className="px-3 py-2 text-xs text-muted-foreground">Loading files…</div>;
  }
  if (error) {
    return <div className="px-3 py-2 text-xs text-destructive">{error}</div>;
  }
  if (list.length === 0) {
    return <div className="px-3 py-2 text-xs text-muted-foreground">No file changes.</div>;
  }

  const totals = list.reduce(
    (acc, f) => {
      acc.add += f.insertions;
      acc.del += f.deletions;
      return acc;
    },
    { add: 0, del: 0 }
  );

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-3 px-3 py-1 border-b text-xs bg-muted/20">
        <span className="font-medium">Files changed ({list.length})</span>
        <span className="text-green-600 dark:text-green-400 tabular-nums">+{totals.add}</span>
        <span className="text-red-600 dark:text-red-400 tabular-nums">−{totals.del}</span>
        {truncated && (
          <span className="ml-auto text-amber-600 dark:text-amber-400">
            Truncated — only showing first {list.length}
          </span>
        )}
      </div>
      <div ref={parentRef} className="overflow-auto flex-1">
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vrow) => {
            const file = list[vrow.index];
            return (
              <FileChangeRow
                key={vrow.key}
                file={file}
                onClick={onOpenFile}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vrow.size,
                  transform: `translateY(${vrow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
