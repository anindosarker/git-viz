import type { DiffHunk as DiffHunkType } from "@git-viz/shared";
import React from "react";
import { DiffLine } from "./DiffLine";

interface DiffHunkProps {
  hunk: DiffHunkType;
}

export const DiffHunk: React.FC<DiffHunkProps> = ({ hunk }) => {
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;

  return (
    <div className="border-b last:border-b-0">
      <div className="px-3 py-1 bg-muted/40 text-xs font-mono text-muted-foreground">
        {hunk.header}
      </div>
      <div>
        {hunk.lines.map((l, i) => {
          let oldN: number | undefined;
          let newN: number | undefined;
          if (l.kind === "context") {
            oldN = oldLine++;
            newN = newLine++;
          } else if (l.kind === "del") {
            oldN = oldLine++;
          } else if (l.kind === "add") {
            newN = newLine++;
          }
          return <DiffLine key={i} kind={l.kind} text={l.text} oldLine={oldN} newLine={newN} />;
        })}
      </div>
    </div>
  );
};
