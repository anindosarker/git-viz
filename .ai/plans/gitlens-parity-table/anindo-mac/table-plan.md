# Plan 6b — TanStack react-table Re-introduction

## Goal

Re-introduce `@tanstack/react-table` as column model layer. Hybrid stack: react-table (model) + react-virtual (rendering) + shadcn-styled cells (visual) + canvas (graph overlay).

## Current state

Plan 3 deleted the old tanstack table commit list. Built custom `CommitTable.tsx` with raw `@tanstack/react-virtual` only. Column system exists (`web/src/graph/columns/*.column.tsx` + `columnRegistry`) but doesn't use react-table.

Result: no sorting, no column show/hide UI, no column pinning, no header sticky.

## Hybrid architecture

```
ColumnDef[]            ← derived from Plan 3 columnRegistry + active columns
  ↓
useReactTable(rows, columns)
  ↓ getRowModel().rows[]
useVirtualizer({count: rows.length, estimateSize, ...})
  ↓ virtualItems[]
<div className="srt-table">                       ← scrollable container
  <div className="srt-header">
    <flexRender column.header />                  ← shadcn-styled TableHeaderCell
  </div>
  <div className="srt-body" style={{height: totalSize}}>
    {virtualItems.map(vi => (
      <div ref={measureElement} style={{transform: translateY(vi.start)}}>
        {row.getVisibleCells().map(cell => flexRender(cell))}
      </div>
    ))}
  </div>
</div>
<canvas absolute overlay /> ← graph col
```

## Column definitions

Each `Column.column.tsx` from Plan 3 exports `ColumnDefinition`. Wrap to TanStack `ColumnDef`:

```ts
const columnDef: ColumnDef<CommitRow> = {
  id: column.id,
  header: column.label,
  cell: ({ row }) => <column.Component row={row.original} context={ctx} />,
  size: column.defaultWidth,
  enableSorting: column.sortable ?? false,
  enableHiding: true,
};
```

Add per-column:
- `sortable`: date, hash, changes (file count), author
- `pinnable`: refs (left), date (right)

## Column show/hide / reorder UI

Replace `PreferencesPanel`'s columns section with TanStack's column visibility API. Drag-reorder via @dnd-kit/sortable (install if needed). Or keep simple up/down buttons.

## Sorting

Header cells become buttons. Click → `column.toggleSorting()`. Sorting indicators: `↑` / `↓`. Sort applies to current loaded commits (client-side); paging fetches more. Backend doesn't re-sort.

## Files

- `web/src/components/Graph/CommitTable.tsx` — full rewrite around `useReactTable`
- `web/src/components/Graph/CommitTableHeader.tsx` (new) — sticky header with shadcn styling
- `web/src/components/Graph/CommitTableRow.tsx` (new) — row component
- `web/src/components/Graph/CommitTableCell.tsx` (new) — cell wrapper with shadcn variants
- `web/src/components/PreferencesPanel/PreferencesPanel.tsx` — wire to react-table visibility/order state
- `web/src/state/store.ts` — sorting slice if needed

## Quality gates

- type-check, lint, build, test
- Behaviour preserved: virtualization works, canvas overlay aligns, infinite scroll triggers
- New: column header click sorts, hidden columns disappear, reorder via prefs panel

## Risks

- Canvas overlay positioning depends on graph column's left offset — need to compute from react-table's column model
- Header sticky requires CSS `position: sticky` on shadcn TableHeader

## Done when

- All Plan 3 functionality preserved
- Sort by date/changes/author works
- Column show/hide via prefs panel
- shadcn-styled rows (consistent with rest of UI)
