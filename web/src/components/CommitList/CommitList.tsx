import type { GitCommit } from "@/types/git";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { calculateGraph } from "../../utils/graph";
import { CommitGraph } from "../Graph/CommitGraph";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { columns } from "./columns";

interface CommitListProps {
  commits: GitCommit[];
  rowHeight: number;
  loading: boolean;
}

export const CommitList: React.FC<CommitListProps> = ({
  commits,
  rowHeight,
  loading,
}) => {
  // Calculate graph layout to get width
  const { width: graphWidth } = React.useMemo(
    () => calculateGraph(commits, rowHeight),
    [commits, rowHeight]
  );

  const table = useReactTable({
    data: commits,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 0,
      size: 0,
    },
  });

  // Update graph column size
  // Note: This is a bit of a hack. Ideally we'd use state for column sizing.
  // But for now, we just rely on the initial render or force a re-render if needed.
  // Actually, we can just style the cell width directly.

  const branchColWidth = 200; // Must match columns.tsx size

  return (
    <div className="relative">
      {/* Graph Overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: branchColWidth,
          top: 48, // Header height
          zIndex: 10,
        }}
      >
        <CommitGraph commits={commits} rowHeight={rowHeight} />
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="h-12 bg-background z-20 relative"
            >
              {headerGroup.headers.map((header) => {
                // Dynamic width for graph column
                let widthStyle: React.CSSProperties = {
                  width: header.getSize(),
                };
                if (header.id === "graph") {
                  widthStyle = { width: graphWidth, minWidth: graphWidth };
                } else if (header.getSize() !== 150 && header.getSize() !== 0) {
                  widthStyle = { width: header.getSize() };
                }

                return (
                  <TableHead key={header.id} style={widthStyle}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="box-border hover:bg-muted/50"
              style={{ height: rowHeight }}
            >
              {row.getVisibleCells().map((cell) => {
                let widthStyle: React.CSSProperties = {};
                if (cell.column.id === "graph") {
                  widthStyle = { width: graphWidth, minWidth: graphWidth };
                }

                return (
                  <TableCell
                    key={cell.id}
                    className="py-0 align-middle"
                    style={widthStyle}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {!loading && commits.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center h-24">
                No commits found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
