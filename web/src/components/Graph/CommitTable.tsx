import { CommitGraph } from "@/components/Graph/CommitGraph";
import { columnRegistry, getColumn, getRenderer } from "@/graph";
import "@/graph/columns/author.column";
import "@/graph/columns/authorAvatar.column";
import "@/graph/columns/changes.column";
import "@/graph/columns/date.column";
import "@/graph/columns/graph.column";
import "@/graph/columns/hash.column";
import "@/graph/columns/refs.column";
import "@/graph/columns/subject.column";
import "@/graph/render/hybrid-canvas-wide";
import type { GraphRow } from "@/graph";
import type { ColumnConfig } from "@/graph/columns/types";
import { useStore } from "@/state/store";
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

function columnWidthCss(c: ColumnConfig): string | number {
  if (c.width === "flex") return "1fr" as unknown as string;
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

  // Estimate graph column max lane usage from current rows
  const maxLanes = useMemo(() => {
    let m = 0;
    for (const r of rows) {
      const c = Math.max(r.inputSwimlanes.length, r.outputSwimlanes.length, r.nodeColumn + 1);
      if (c > m) m = c;
    }
    return Math.max(1, m);
  }, [rows]);

  const graphWidth = maxLanes * laneWidth + laneWidth;

  // Override graph column width to match canvas width
  const effectiveGridTemplate = useMemo(() => {
    return visibleColumns
      .map((c) => {
        if (c.config.id === "graph") return `${graphWidth}px`;
        return columnWidthCss(c.config);
      })
      .join(" ");
  }, [visibleColumns, graphWidth]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 12,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Trigger pagination when near the bottom
  const onEndRef = useRef(onEndReached);
  useEffect(() => {
    onEndRef.current = onEndReached;
  }, [onEndReached]);
  useEffect(() => {
    if (!items.length) return;
    const lastIndex = items[items.length - 1].index;
    if (lastIndex >= rows.length - endReachedThreshold) {
      onEndRef.current?.();
    }
  }, [items, rows.length, endReachedThreshold]);

  const handleSelect = useCallback(
    (hash: string) => {
      select(hash);
      onSelect?.(hash);
    },
    [select, onSelect]
  );

  // Visible range for canvas optimization
  const visibleRange = useMemo(() => {
    if (!items.length) return { start: 0, end: 0 };
    return { start: items[0].index, end: items[items.length - 1].index + 1 };
  }, [items]);

  return (
    <div ref={parentRef} className="relative h-full w-full overflow-auto">
      <div
        className="sticky top-0 z-30 bg-background border-b text-xs font-medium text-muted-foreground"
        style={{ display: "grid", gridTemplateColumns: effectiveGridTemplate }}
      >
        {visibleColumns.map(({ def }) => (
          <div key={def.id} className="px-2 h-9 flex items-center">
            {def.label}
          </div>
        ))}
      </div>

      <div style={{ height: totalSize, position: "relative" }}>
        {/* Canvas overlay positioned at the graph column */}
        {graphColIndex >= 0 && (
          <div
            className="absolute pointer-events-auto"
            style={{
              top: 0,
              left: visibleColumns.slice(0, graphColIndex).reduce((acc, c) => {
                if (typeof c.config.width === "number") return acc + c.config.width;
                return acc;
              }, 0),
              width: graphWidth,
              height: totalSize,
            }}
          >
            <CommitGraph
              commits={rows.map((r) => r.commit)}
              rowHeight={effectiveRowHeight}
              visibleRange={visibleRange}
              onSelect={handleSelect}
            />
          </div>
        )}

        {items.map((vi) => {
          const row = rows[vi.index];
          const isSelected = row.commit.hash === selectedHash;
          return (
            <div
              key={row.commit.hash}
              className={
                "absolute left-0 right-0 hover:bg-muted/40 cursor-pointer " +
                (isSelected ? "bg-muted/60" : "")
              }
              style={{
                top: vi.start,
                height: vi.size,
                display: "grid",
                gridTemplateColumns: effectiveGridTemplate,
                alignItems: "center",
              }}
              onClick={() => handleSelect(row.commit.hash)}
            >
              {visibleColumns.map(({ config, def }) => {
                if (def.id === "graph") {
                  return <div key={def.id} className="h-full" />;
                }
                const ColumnComp = def.Component;
                return (
                  <div key={def.id} className="px-2 overflow-hidden text-sm">
                    <ColumnComp
                      row={row}
                      context={{ refsInline: !!config.refsInline, ...config }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!loading && rows.length === 0 && (
        <div className="text-center text-muted-foreground p-8">No commits found</div>
      )}
    </div>
  );
};
