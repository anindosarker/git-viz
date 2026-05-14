# Plan 3 — Graph Contracts (Algorithms, Renderers, Columns)

## Goal

Define stable contracts for graph computation, rendering, and column layout. Bundle three preset view modes. After Plan 3, Plan 4 drops new algorithms into a slot without restructuring anything.

## Non-goals

- New algorithms beyond the existing rolling algo wrapped as `Impl-1` (Plan 4)
- Backend changes (Plan 1)
- File/folder reorg (Plan 2)
- Feature additions like inline diff, search, etc. (Plan 5)

## Decisions locked

1. Three preset view modes: `gitlens-like`, `git-graph-like`, `vscode-scm-graph-like`
2. Loose algo↔renderer pairing — normalized swimlane contract, mix and match
3. Style selector = dropdown in TopBar, persisted via Zustand + VS Code settings
4. **Hybrid canvas**: Canvas for graph column only. DOM for everything else.
5. Incremental compute for infinite scroll (resumable algo state)
6. Column system: id-based defs, user toggle/reorder/resize, presets seed defaults
7. Refs rendering configurable: `inline | left-column | right-column`. Each preset has its own default.
8. `kind` field supported on rows: `'HEAD' | 'node' | 'working-tree' | 'incoming' | 'outgoing'` (last two deferred to Plan 5)

## Contracts

### Normalized graph row model

Lifted from VSCode SCM (`scm/common/history.ts`). All algos emit this shape:

```ts
// web/src/graph/types.ts

export interface GraphNode {
  id: string;          // commit hash this lane represents (parent ref)
  color: string;       // resolved CSS color
}

export interface GraphRow {
  kind: 'HEAD' | 'node' | 'working-tree' | 'incoming' | 'outgoing';
  commit: CommitRow;          // hash, subject, refs joined, etc.
  inputSwimlanes: GraphNode[];
  outputSwimlanes: GraphNode[];
  // Position of the commit's node circle within swimlanes (column index)
  nodeColumn: number;
  // Renderer-specific extras any algo may pass through
  metadata?: Record<string, unknown>;
}

export interface CommitRow extends GitCommitSummary {
  refs: GitRefPointer[];                  // joined from refs snapshot
  authorAvatar?: string;
}
```

### Algorithm interface

```ts
// web/src/graph/algos/types.ts

export interface ComputeInput {
  commits: GitCommitSummary[];   // page slice or full list
  refs: GitRefsSnapshot;
  head: GitHeadState;
  workingTree?: { dirty: boolean };
  prevState?: ComputeState;      // continuation for incremental
}

// Opaque to consumers. Each algo defines its own internal shape.
export type ComputeState = unknown;

export interface ComputeResult {
  rows: GraphRow[];
  state: ComputeState;           // pass back as prevState on next page
  laneCount: number;             // max width seen, for canvas sizing
}

export interface GraphAlgorithm {
  id: string;                    // "rolling" | "gitlens-like" | ...
  label: string;
  description?: string;
  compute(input: ComputeInput): ComputeResult;
}
```

**Incremental rule:** Calling `compute({ commits: pageN, prevState: result_pageN-1.state })` must yield the same rows for pageN as a full-fat call with all commits up to pageN. Algo authors must preserve enough state to continue swimlane assignment correctly.

### Renderer interface

```ts
// web/src/graph/render/types.ts

export interface GraphRendererProps {
  rows: GraphRow[];
  rowHeight: number;
  laneWidth: number;
  visibleRange: { start: number; end: number };  // for virtualization
  selectedHash?: string;
  hoveredHash?: string;
  onSelect?: (hash: string) => void;
  onHover?: (hash: string | null) => void;
}

export interface GraphRenderer {
  id: string;                    // "gitlens-canvas" | "git-graph-svg" | ...
  label: string;
  defaultRowHeight: number;
  defaultLaneWidth: number;
  /** Canvas-based: draws into provided canvas. DOM: returns ReactNode. */
  Component: React.FC<GraphRendererProps>;
}
```

Each renderer is a React component. Hybrid canvas renderer = component contains `<canvas>` + virtualization wrapper. Pure-SVG renderer also valid (good for low row counts).

### View preset = algo + renderer + columns

```ts
// web/src/graph/presets/types.ts

export interface ViewPreset {
  id: 'gitlens-like' | 'git-graph-like' | 'vscode-scm-graph-like';
  label: string;
  algorithmId: string;
  rendererId: string;
  defaultColumns: ColumnConfig[];
  defaultRefDisplay: 'inline' | 'left-column' | 'right-column';
  defaultRowHeight: number;
}
```

User picks preset → store seeded with defaults. User then customizes columns/refs.

### Column system

```ts
// web/src/graph/columns/types.ts

export type ColumnId =
  | 'refs'
  | 'graph'
  | 'subject'
  | 'author'
  | 'authorAvatar'
  | 'changes'      // file count + insertion/deletion bar (GitLens-style)
  | 'date'
  | 'hash'
  | 'sha';         // alias of hash, short

export interface ColumnConfig {
  id: ColumnId;
  visible: boolean;
  width: number | 'flex';
  // Subject column reads this to decide whether to render inline ref pills
  refsInline?: boolean;
}

export interface ColumnRendererProps {
  row: GraphRow;
  // settings the column may need (e.g., date format)
  context: ColumnContext;
}

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  defaultWidth: number | 'flex';
  Component: React.FC<ColumnRendererProps>;
}
```

Column registry maps `ColumnId → ColumnDefinition`. Table renders visible columns in order. `refs` column has 3-state position: hidden, left, right. UI keeps that consistent (only one of refs-column-left, refs-column-right, refs-inline at a time).

## Preset specifics

### `gitlens-like`

- Refs: **left column** before graph
- Columns default order: `refs, graph, subject, author, changes, date, sha`
- Algo: `gitlens-like` (Plan 4 — branch-tip-pre-allocation, HEAD leftmost)
- Renderer: `hybrid-canvas-compact` — narrow lanes, avatar inside node, 24px rows
- Row kinds shown: `HEAD`, `node`, `working-tree`

### `git-graph-like`

- Refs: **inline** in subject column as pills
- Columns: `graph, subject, date, author, sha`
- Algo: `rolling` (current logic wrapped)
- Renderer: `hybrid-canvas-wide` — wide colorful lanes, no avatar, 28px rows
- Row kinds shown: `node` only (HEAD shown via inline `HEAD ->` pill)

### `vscode-scm-graph-like`

- Refs: **right column**
- Columns: `graph, subject, author, sha, date, refs`
- Algo: `rolling` (or new `scm-graph-topo` in Plan 4)
- Renderer: `hybrid-canvas-medium` — medium lanes, no avatar, 22px rows
- Row kinds shown: `HEAD`, `node`

## File layout (lands inside Plan 2 structure)

```
web/src/graph/
├── index.ts                         # public re-exports
├── types.ts                         # GraphNode, GraphRow, CommitRow
├── algos/
│   ├── types.ts                     # GraphAlgorithm, ComputeInput, ...
│   ├── registry.ts                  # algorithmRegistry map
│   └── rolling.ts                   # current logic, wrapped
├── render/
│   ├── types.ts                     # GraphRenderer, GraphRendererProps
│   ├── registry.ts                  # rendererRegistry map
│   ├── primitives/                  # shared canvas drawing helpers
│   │   ├── lane.ts                  # vertical line, curve, merge curve
│   │   ├── node.ts                  # circle, avatar
│   │   └── palette.ts               # color lookup, theme-aware
│   ├── hybrid-canvas-compact.tsx
│   ├── hybrid-canvas-wide.tsx
│   └── hybrid-canvas-medium.tsx
├── columns/
│   ├── types.ts
│   ├── registry.ts
│   ├── refs.column.tsx
│   ├── subject.column.tsx          # reads refsInline flag
│   ├── author.column.tsx
│   ├── changes.column.tsx
│   ├── date.column.tsx
│   ├── hash.column.tsx
│   └── authorAvatar.column.tsx
├── presets/
│   ├── types.ts
│   ├── registry.ts
│   ├── gitlens-like.ts
│   ├── git-graph-like.ts
│   └── vscode-scm-graph-like.ts
└── join.ts                          # joins refs into CommitRow client-side
```

## Hybrid canvas details

- One `<canvas>` per visible range, absolute-positioned over the table's graph column cells
- Resize observer keeps canvas pixel size synced with column width × visible row count
- Renderer draws only visible rows on scroll; uses `requestAnimationFrame` + dirty flag
- DOM table rows have a transparent `<td>` for the graph column — canvas overlays it
- Hit testing for node clicks: compute `nodeColumn × laneWidth` from row coords, listen on canvas mousedown, dispatch `onSelect(hash)` upward. DOM rows handle row-level hover/select; canvas only handles node clicks.

Accessibility: DOM table is the source of truth for screen readers. Canvas is decorative.

## State (Zustand store from Plan 2)

New slices:

```ts
interface GraphSlice {
  presetId: ViewPresetId;
  algorithmId: string;
  rendererId: string;
  columns: ColumnConfig[];
  refDisplay: 'inline' | 'left-column' | 'right-column';
  rowHeight: number;
  // computed result, cached, invalidated on commits/refs change
  result?: ComputeResult;
}
```

Actions: `setPreset(id)`, `setColumn(config)`, `toggleColumn(id)`, `reorderColumns(order)`, `setRefDisplay(mode)`, `recompute()`.

## TopBar selector UI

```
[Preset: GitLens ▼]  [Columns ▾]  [Refresh]
```

`Preset` dropdown lists three presets + custom (if user has deviated from any preset). `Columns` menu = checklist with drag handles to reorder.

## Render flow

```
Plan 1 backend
  ↓ (bootstrap + refs + commit pages)
useGit hook (Plan 2)
  ↓ (commits[], refs, head)
join.ts → CommitRow[] (refs merged onto each commit, working-tree row prepended if dirty)
  ↓
algo.compute(...)  → rows[] + state
  ↓ cache state for next page
renderer.Component({ rows, visibleRange, ... })
  ↓
Canvas (graph col) + DOM (other cols) rendered side-by-side via virtualized table
```

## Sequencing

1. **C-1**: Define types + registries (`algos/`, `render/`, `columns/`, `presets/`). No logic yet. Land empty registries with TS interfaces.
2. **C-2**: Wrap current `calculateGraph` as `algorithmRegistry['rolling']`. Make incremental: track `colorMap` + last `outputSwimlanes` in `ComputeState`.
3. **C-3**: Build first hybrid-canvas renderer (`hybrid-canvas-wide`). Replace current SVG `<CommitGraph>` + `<GraphRow>` with table + canvas overlay.
4. **C-4**: Implement column registry + render the three default columns (`graph`, `subject`, `author`). Add table-with-virtualization (`@tanstack/react-virtual`).
5. **C-5**: Add `refs` column. Wire 3-state ref display switch. Pill component shared across inline/column modes.
6. **C-6**: Add remaining columns (`date`, `hash`, `changes`, `authorAvatar`).
7. **C-7**: Build other two renderers (`hybrid-canvas-compact`, `hybrid-canvas-medium`).
8. **C-8**: Build three presets + TopBar preset dropdown + column menu UI.
9. **C-9**: Working-tree row + HEAD row kinds rendered specially.
10. **C-10**: Verify infinite scroll triggers `getNextPage` and feeds `prevState` to compute. Bench at 5k, 10k, 50k commits.

## Reference repos

- `vscode-git-graph/web/main.ts` — its graph renderer (single-canvas approach). Read for canvas patterns. Theirs is one-shot full-render, ours is virtualized.
- `vscode-git-graph/src/dataSource.ts` — for understanding what data feeds it.
- `vscode/src/vs/workbench/contrib/scm/browser/scmHistory.ts` — VSCode SCM graph renderer. Read for swimlane painting algorithm, lane reuse logic.
- `vscode/src/vs/workbench/contrib/scm/common/history.ts` — `ISCMHistoryItemViewModel` matches our `GraphRow` shape. Confirms contract.

Mine for understanding. Write fresh code in our style.

## Testing

- Unit-test `rolling` algo: feed known commit DAGs (linear, merge, octopus, criss-cross), snapshot row outputs.
- Unit-test incremental: full-compute(A+B) == compute(A) then compute(B, state). Property test with random DAGs.
- Renderer: visual fixtures. Standalone server pointed at a fixture repo, screenshot per preset.
- Performance bench: 5k / 10k / 50k commit synthetic repo. Target: first paint < 200ms after page 1 loads; subsequent pages append < 50ms.

## Open / decide during impl

- Canvas device pixel ratio handling (retina)
- Theme integration: VS Code color tokens → CSS vars → canvas palette
- Working-tree row data source: backend exposes `repo.hasUncommittedChanges` in `bootstrap` (already in Plan 1). Need file-list summary? Defer to Plan 5.
- HEAD detection: backend provides `head` in `GitRefsSnapshot`. Row kind set during `join.ts`.

## Done when

- `pnpm -r type-check` green on new contracts
- All three presets selectable, each renders correctly on fixture repo
- Column toggle/reorder/resize works; persists in store
- Refs switchable inline / left / right; pills look right in all modes
- Infinite scroll loads pages 2+ and graph stays consistent (no lane re-color, no jumps)
- Canvas + DOM hybrid: row hover/select works, refs/text copyable, screen reader reads commits
- Plan 4 can drop a new `GraphAlgorithm` into `algos/registry.ts` and `gitlens-like` preset switches to it without touching renderers/columns
