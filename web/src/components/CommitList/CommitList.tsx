import type { CommitRow } from "@/types/git";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { rollingAlgorithm } from "@/graph";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { runAction } from "../Actions/runAction";
import { CommitDetails } from "../CommitDetails/CommitDetails";
import { CommitGraph } from "../Graph/CommitGraph";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { columns } from "./columns";

interface CommitListProps {
  commits: CommitRow[];
  rowHeight: number;
  loading: boolean;
}

export const CommitList: React.FC<CommitListProps> = ({ commits, rowHeight, loading }) => {
  // Calculate graph layout to get width
  const graphWidth = React.useMemo(() => {
    const result = rollingAlgorithm.compute({ commits, rowHeight, laneWidth: 20 });
    return result.laneCount * 20 + 40;
  }, [commits, rowHeight]);

  // eslint-disable-next-line react-hooks/incompatible-library
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
                      const hash = row.original.hash;
                      useActionsStore.getState().openConfirm({
                        title: "Checkout commit",
                        description: `Check out ${hash.slice(0, 7)}? This will detach HEAD.`,
                        confirmLabel: "Checkout",
                        onConfirm: async () => {
                          await runAction(`Checkout ${hash.slice(0, 7)}`, () =>
                            gitActions.checkoutRef({ ref: hash })
                          );
                        },
                      });
                    }}
                  >
                    Checkout commit…
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      useActionsStore.getState().openModal({
                        kind: "branch-create",
                        context: { startPoint: row.original.hash },
                      });
                    }}
                  >
                    Create branch from this commit…
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger inset>
                      Reset current branch to here
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          useActionsStore.getState().openModal({
                            kind: "reset",
                            context: { target: row.original.hash, mode: "soft" },
                          });
                        }}
                      >
                        Soft
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          useActionsStore.getState().openModal({
                            kind: "reset",
                            context: { target: row.original.hash, mode: "mixed" },
                          });
                        }}
                      >
                        Mixed
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          useActionsStore.getState().openModal({
                            kind: "reset",
                            context: { target: row.original.hash, mode: "hard" },
                          });
                        }}
                      >
                        Hard (destructive)
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      useActionsStore.getState().openModal({
                        kind: "cherry-pick",
                        context: { hashes: [row.original.hash] },
                      });
                    }}
                  >
                    Cherry-pick
                  </ContextMenuItem>
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      useActionsStore.getState().openModal({
                        kind: "revert",
                        context: { hash: row.original.hash },
                      });
                    }}
                  >
                    Revert
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    inset
                    onClick={(e) => {
                      e.stopPropagation();
                      useActionsStore.getState().openModal({
                        kind: "tag-create",
                        context: { target: row.original.hash },
                      });
                    }}
                  >
                    Create tag here…
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
                      navigator.clipboard.writeText(row.original.subject);
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
