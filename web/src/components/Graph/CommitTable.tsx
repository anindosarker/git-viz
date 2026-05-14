import { CommitGraph } from "@/components/Graph/CommitGraph";
import { CommitTableHeader } from "@/components/Graph/CommitTableHeader";
import { CommitTableRow } from "@/components/Graph/CommitTableRow";
import { columnRegistry, getColumn, getRenderer } from "@/graph";
import "@/graph/columns/author.column";
import "@/graph/columns/authorAvatar.column";
import "@/graph/columns/changes.column";
import "@/graph/columns/date.column";
import "@/graph/columns/graph.column";
import "@/graph/columns/hash.column";
import "@/graph/columns/refs.column";
import "@/graph/columns/subject.column";
import "@/graph/render/hybrid-canvas-compact";
import "@/graph/render/hybrid-canvas-medium";
import "@/graph/render/hybrid-canvas-wide";
import type { GraphRow } from "@/graph";
import type { ColumnConfig } from "@/graph/columns/types";
import { useStore } from "@/state/store";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

interface CommitTableProps {
  rows: GraphRow[];
  loading?: boolean;
  onSelect?: (hash: string) => void;
  onEndReached?: () => void;
  /** trigger onEndReached when last visible index >= rows.length - threshold */
  endReachedThreshold?: number;
}

function columnWidthCss(c: ColumnConfig): string {
  if (c.width === "flex") return "minmax(0, 1fr)";
  return `${c.width}px`;
}

export const CommitTable: React.FC<CommitTableProps> = ({
  rows,
  loading,
  onSelect,
  onEndReached,
  endReachedThreshold = 30,
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowHeight = useStore((s) => s.rowHeight);
  const columns = useStore((s) => s.columns);
  const refDisplay = useStore((s) => s.refDisplay);
  const rendererId = useStore((s) => s.rendererId);
  const selectedHash = useStore((s) => s.selectedHash);
  const select = useStore((s) => s.select);
  const sorting = useStore((s) => s.sorting);
  const setSorting = useStore((s) => s.setSorting);
  const setColumns = useStore((s) => s.setColumns);

  const renderer = getRenderer(rendererId);
  const effectiveRowHeight = renderer?.defaultRowHeight ?? rowHeight;
  const laneWidth = renderer?.defaultLaneWidth ?? 24;

  const visibleColumns = useMemo(() => {
    return columns
      .filter((c) => {
        if (c.id === "refs") return refDisplay !== "inline";
        return c.visible;
      })
      .map((c) => {
        const config: ColumnConfig =
          c.id === "subject" ? { ...c, refsInline: refDisplay === "inline" } : c;
        const def = getColumn(config.id) ?? columnRegistry.get(config.id);
        return { config, def };
      })
      .filter(
        (x): x is { config: ColumnConfig; def: NonNullable<ReturnType<typeof getColumn>> } =>
          !!x.def
      );
  }, [columns, refDisplay]);

  const graphColIndex = visibleColumns.findIndex((c) => c.config.id === "graph");

  const maxLanes = useMemo(() => {
    let m = 0;
    for (const r of rows) {
      const c = Math.max(r.inputSwimlanes.length, r.outputSwimlanes.length, r.nodeColumn + 1);
      if (c > m) m = c;
    }
    return Math.max(1, m);
  }, [rows]);

  const graphWidth = maxLanes * laneWidth + laneWidth;

  const gridTemplate = useMemo(() => {
    return visibleColumns
      .map((c) => {
        if (c.config.id === "graph") return `${graphWidth}px`;
        return columnWidthCss(c.config);
      })
      .join(" ");
  }, [visibleColumns, graphWidth]);

  const tableColumns = useMemo<ColumnDef<GraphRow>[]>(() => {
    return visibleColumns.map(({ config, def }) => {
      const cell = ({ row }: { row: { original: GraphRow } }) => {
        const ColumnComp = def.Component;
        return (
          <ColumnComp row={row.original} context={{ refsInline: !!config.refsInline, ...config }} />
        );
      };
      const base = {
        id: def.id,
        header: def.label,
        enableSorting: !!def.sortable,
        enableHiding: true,
        cell,
      };
      switch (config.id) {
        case "date":
          return {
            ...base,
            accessorFn: (r: GraphRow) => r.commit.authorDate ?? "",
            sortingFn: "datetime",
          } as ColumnDef<GraphRow>;
        case "author":
          return {
            ...base,
            accessorFn: (r: GraphRow) => r.commit.author ?? "",
            sortingFn: "alphanumeric",
          } as ColumnDef<GraphRow>;
        case "hash":
          return {
            ...base,
            accessorFn: (r: GraphRow) => r.commit.hash ?? "",
            sortingFn: "alphanumeric",
          } as ColumnDef<GraphRow>;
        case "changes":
          return {
            ...base,
            accessorFn: (r: GraphRow) =>
              (r.commit as unknown as { stats?: { files?: number } }).stats?.files ?? 0,
            sortingFn: "basic",
          } as ColumnDef<GraphRow>;
        default:
          return base as ColumnDef<GraphRow>;
      }
    });
  }, [visibleColumns]);

  const columnVisibility = useMemo(() => {
    const v: Record<string, boolean> = {};
    for (const c of columns) v[c.id] = c.visible;
    return v;
  }, [columns]);

  const columnOrder = useMemo(() => columns.map((c) => c.id), [columns]);

  const onSortingChange = useCallback(
    (updater: SortingState | ((s: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
    },
    [sorting, setSorting]
  );

  const onColumnVisibilityChange = useCallback(
    (
      updater: Record<string, boolean> | ((s: Record<string, boolean>) => Record<string, boolean>)
    ) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      setColumns(columns.map((c) => ({ ...c, visible: next[c.id] ?? c.visible })));
    },
    [columns, columnVisibility, setColumns]
  );

  const onColumnOrderChange = useCallback(
    (updater: string[] | ((s: string[]) => string[])) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      const byId = new Map(columns.map((c) => [c.id, c]));
      const reordered: ColumnConfig[] = [];
      for (const id of next) {
        const c = byId.get(id as ColumnConfig["id"]);
        if (c) reordered.push(c);
      }
      for (const c of columns) if (!next.includes(c.id)) reordered.push(c);
      setColumns(reordered);
    },
    [columns, columnOrder, setColumns]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange,
    onColumnVisibilityChange,
    onColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getRowModel().rows;
  const isCustomSorted = sorting.length > 0;

  const measuredIndicesRef = useRef<Set<number>>(new Set());
  // Reset measure cache when row count or height changes
  useEffect(() => {
    measuredIndicesRef.current = new Set();
  }, [rows.length, effectiveRowHeight]);

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 10,
    measureElement: (el) => {
      const idxAttr = el.getAttribute("data-index");
      if (idxAttr) {
        const idx = Number(idxAttr);
        if (measuredIndicesRef.current.has(idx)) {
          return effectiveRowHeight;
        }
        measuredIndicesRef.current.add(idx);
      }
      return el.getBoundingClientRect().height;
    },
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const onEndRef = useRef(onEndReached);
  useEffect(() => {
    onEndRef.current = onEndReached;
  }, [onEndReached]);
  useEffect(() => {
    if (!items.length) return;
    const lastIndex = items[items.length - 1].index;
    if (lastIndex >= sortedRows.length - endReachedThreshold) {
      onEndRef.current?.();
    }
  }, [items, sortedRows.length, endReachedThreshold]);

  const handleSelect = useCallback(
    (hash: string) => {
      select(hash);
      onSelect?.(hash);
    },
    [select, onSelect]
  );

  const visibleRange = useMemo(() => {
    if (!items.length) return { start: 0, end: 0 };
    return { start: items[0].index, end: items[items.length - 1].index + 1 };
  }, [items]);

  const canvasLeftOffset = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < graphColIndex; i++) {
      const w = visibleColumns[i].config.width;
      if (typeof w === "number") offset += w;
    }
    return offset;
  }, [visibleColumns, graphColIndex]);

  // Graph rendering uses the original (non-sorted) commits in their stored order.
  // When user applies a custom sort, the lane geometry no longer aligns with
  // the displayed rows, so we hide the canvas overlay until sort is cleared.
  const graphCommits = useMemo(() => rows.map((r) => r.commit), [rows]);

  return (
    <div ref={parentRef} className="relative h-full w-full overflow-auto">
      <CommitTableHeader headerGroups={table.getHeaderGroups()} gridTemplate={gridTemplate} />

      <div style={{ height: totalSize, position: "relative" }}>
        {graphColIndex >= 0 && !isCustomSorted && (
          <div
            className="absolute pointer-events-auto"
            style={{
              top: 0,
              left: canvasLeftOffset,
              width: graphWidth,
              height: totalSize,
            }}
          >
            <CommitGraph
              commits={graphCommits}
              rowHeight={effectiveRowHeight}
              visibleRange={visibleRange}
              onSelect={handleSelect}
            />
          </div>
        )}

        {items.map((vi) => {
          const row = sortedRows[vi.index];
          if (!row) return null;
          const isSelected = row.original.commit.hash === selectedHash;
          return (
            <CommitTableRow
              key={row.original.commit.hash}
              row={row}
              virtualItem={vi}
              virtualizer={virtualizer}
              gridTemplate={gridTemplate}
              isSelected={isSelected}
              onSelect={handleSelect}
            />
          );
        })}
      </div>

      {!loading && sortedRows.length === 0 && (
        <div className="text-center text-muted-foreground p-8">No commits found</div>
      )}
    </div>
  );
};
