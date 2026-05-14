import type { GitCommit } from "@/types/git";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { rollingAlgorithm } from "@/graph";
import gitDataService from "../../services/git-data.service";
import { CommitDetails } from "../CommitDetails/CommitDetails";
import { CommitGraph } from "../Graph/CommitGraph";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { columns } from "./columns";

interface CommitListProps {
  commits: GitCommit[];
  rowHeight: number;
  loading: boolean;
}

export const CommitList: React.FC<CommitListProps> = ({ commits, rowHeight, loading }) => {
  // Calculate graph layout to get width
  const graphWidth = React.useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight, laneWidth: 20 });
    return result.laneCount * 20 + 40;
  }, [commits, rowHeight]);

  const table = useReactTable({
    data: commits,
    columns,
    getRowId: (row) => row.hash, // Use hash as ID for expansion map
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
    <div className="relative w-full overflow-x-auto">
      {/* Graph Overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: branchColWidth + 30, // 200 (branches) + 30 (expander)
          top: 48, // Header height
          zIndex: 10,
          pointerEvents: "none", // Force pointer-events: none
        }}
      >
        <CommitGraph
          commits={commits}
          rowHeight={rowHeight}
          expandedRows={table.getState().expanded}
        />
      </div>

      <table className="w-full caption-bottom text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="h-12 bg-background z-20 relative">
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <TableRow
                    className="box-border hover:bg-muted/50 cursor-pointer"
                    style={{ height: rowHeight }}
                    onClick={() => row.toggleExpanded()}
                    data-state={row.getIsExpanded() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      let widthStyle: React.CSSProperties = {};
                      if (cell.column.id === "graph") {
                        widthStyle = {
                          width: graphWidth,
                          minWidth: graphWidth,
                        };
                      }

                      return (
                        <TableCell key={cell.id} className="py-0 align-middle" style={widthStyle}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      gitDataService.checkoutCommit(row.original.hash);
                    }}
                  >
                    Switch to Commit...
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement branch creation
                    }}
                  >
                    Create Branch...
                  </ContextMenuItem>
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement tag creation
                    }}
                  >
                    Create Tag...
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(row.original.hash);
                    }}
                  >
                    Copy SHA
                  </ContextMenuItem>
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(row.original.message);
                    }}
                  >
                    Copy Message
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              {row.getIsExpanded() && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <div style={{ height: 256, overflowY: "auto" }}>
                      <CommitDetails
                        commit={row.original}
                        contentPaddingLeft={branchColWidth + 30 + graphWidth}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
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
