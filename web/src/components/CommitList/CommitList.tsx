import type { CommitRow } from "@/types/git";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React from "react";
import { rollingAlgorithm } from "@/graph";
import { useStore } from "../../state/store";
import { CommitGraph } from "../Graph/CommitGraph";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { CommitContextMenu } from "./CommitContextMenu";
import { columns } from "./columns";

interface CommitListProps {
  commits: CommitRow[];
  rowHeight: number;
  loading: boolean;
}

export const CommitList: React.FC<CommitListProps> = ({ commits, rowHeight, loading }) => {
  const selectedHash = useStore((s) => s.selectedHash);
  const select = useStore((s) => s.select);

  const graphWidth = React.useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight, laneWidth: 20 });
    return result.laneCount * 20 + 40;
  }, [commits, rowHeight]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: commits,
    columns,
    getRowId: (row) => row.hash,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { minSize: 0, size: 0 },
  });

  const branchColWidth = 200;

  return (
    <div className="relative w-full overflow-x-auto">
      <div
        className="absolute pointer-events-none"
        style={{
          left: branchColWidth,
          top: 48,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <CommitGraph commits={commits} rowHeight={rowHeight} expandedRows={{}} />
      </div>

      <table className="w-full caption-bottom text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="h-12 bg-background z-20 relative">
              {headerGroup.headers.map((header) => {
                let widthStyle: React.CSSProperties = { width: header.getSize() };
                if (header.id === "graph") {
                  widthStyle = { width: graphWidth, minWidth: graphWidth };
                } else if (header.getSize() !== 150 && header.getSize() !== 0) {
                  widthStyle = { width: header.getSize() };
                }
                return (
                  <TableHead key={header.id} style={widthStyle}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isSelected = row.original.hash === selectedHash;
            return (
              <CommitContextMenu key={row.id} commit={row.original}>
                <TableRow
                  className="box-border hover:bg-muted/50 cursor-pointer"
                  style={{ height: rowHeight }}
                  onClick={() => select(row.original.hash)}
                  data-state={isSelected ? "selected" : undefined}
                  data-testid="commit-row"
                >
                  {row.getVisibleCells().map((cell) => {
                    let widthStyle: React.CSSProperties = {};
                    if (cell.column.id === "graph") {
                      widthStyle = { width: graphWidth, minWidth: graphWidth };
                    }
                    return (
                      <TableCell key={cell.id} className="py-0 align-middle" style={widthStyle}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </CommitContextMenu>
            );
          })}
          {!loading && commits.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center h-24">
                No commits found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </table>
    </div>
  );
};
