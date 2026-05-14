import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { flexRender, type HeaderGroup } from "@tanstack/react-table";
import type { GraphRow } from "@/graph";
import React from "react";

interface Props {
  headerGroups: HeaderGroup<GraphRow>[];
  gridTemplate: string;
}

export const CommitTableHeader: React.FC<Props> = ({ headerGroups, gridTemplate }) => {
  return (
    <div
      role="row"
      className="sticky top-0 z-30 bg-background border-b text-xs font-medium text-muted-foreground"
      style={{ display: "grid", gridTemplateColumns: gridTemplate }}
    >
      {headerGroups.flatMap((hg) =>
        hg.headers.map((header) => {
          const canSort = header.column.getCanSort();
          const sorted = header.column.getIsSorted();
          const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
          return (
            <div
              key={header.id}
              role="columnheader"
              className="px-2 h-9 flex items-center select-none"
              aria-sort={
                sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
              }
            >
              {canSort ? (
                <button
                  type="button"
                  onClick={header.column.getToggleSortingHandler()}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                  <Icon className="h-3 w-3 opacity-60" />
                </button>
              ) : (
                <span>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
