import type { ColumnConfig, ColumnId } from "@/graph/columns/types";
import { getPreset } from "@/graph/presets/registry";
import type { RefDisplay } from "@/graph/presets/types";
import type { CommitsGetPageResponse, GitCommitSummary, GitRefsSnapshot } from "@git-viz/shared";
import { create } from "zustand";
import { debounce, getPersistAdapter, type PersistedState } from "./persist";

export type DateFormat = "relative" | "absolute" | "iso";
export type { RefDisplay };

interface CommitsSlice {
  commits: GitCommitSummary[];
  hasMore: boolean;
  nextCursor?: string;
  loading: boolean;
  setCommitsLoading: (loading: boolean) => void;
  appendPage: (page: CommitsGetPageResponse) => void;
  resetCommits: () => void;
}

interface RefsSlice {
  refs?: GitRefsSnapshot;
  loadingRefs: boolean;
  setRefs: (r: GitRefsSnapshot) => void;
  setLoadingRefs: (loading: boolean) => void;
}

interface SelectionSlice {
  selectedHash?: string;
  hoveredHash?: string;
  scrollY: number;
  select: (hash?: string) => void;
  hover: (hash?: string) => void;
  setScrollY: (y: number) => void;
}

interface ViewSlice {
  presetId: string;
  algorithmId: string;
  rendererId: string;
  rowHeight: number;
  columns: ColumnConfig[];
  refDisplay: RefDisplay;
  dateFormat: DateFormat;
  showWorkingTree: boolean;
  topoOrder: boolean;
  pageSize: number;
  setPreset: (id: string) => void;
  setAlgorithm: (id: string) => void;
  setRenderer: (id: string) => void;
  setRowHeight: (h: number) => void;
  setColumns: (cols: ColumnConfig[]) => void;
  toggleColumn: (id: ColumnConfig["id"]) => void;
  setRefDisplay: (mode: RefDisplay) => void;
  setDateFormat: (f: DateFormat) => void;
  setShowWorkingTree: (v: boolean) => void;
  setTopoOrder: (v: boolean) => void;
  setPageSize: (n: number) => void;
  applyConfig: (values: Record<string, unknown>) => void;
}

interface UISlice {
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
}

export type Store = CommitsSlice & RefsSlice & SelectionSlice & ViewSlice & UISlice;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "graph", visible: true, width: "flex" },
  { id: "subject", visible: true, width: "flex", refsInline: true },
  { id: "date", visible: true, width: 150 },
  { id: "author", visible: true, width: 200 },
  { id: "hash", visible: true, width: 80 },
];

function normalizeColumns(raw: unknown): ColumnConfig[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ColumnConfig[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ id: item as ColumnId, visible: true, width: "flex" });
    } else if (item && typeof item === "object" && typeof (item as ColumnConfig).id === "string") {
      const c = item as ColumnConfig;
      out.push({
        id: c.id,
        visible: c.visible ?? true,
        width: c.width ?? "flex",
        ...(c.refsInline !== undefined ? { refsInline: c.refsInline } : {}),
      });
    }
  }
  return out.length > 0 ? out : undefined;
}

const adapter = getPersistAdapter();
const initial = adapter.get();

export const useStore = create<Store>()((set) => ({
  commits: [],
  hasMore: false,
  nextCursor: undefined,
  loading: false,
  setCommitsLoading: (loading) => set({ loading }),
  appendPage: (page) =>
    set((state) => ({
      commits: state.commits.length === 0 ? page.commits : [...state.commits, ...page.commits],
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    })),
  resetCommits: () => set({ commits: [], hasMore: false, nextCursor: undefined, loading: false }),

  refs: undefined,
  loadingRefs: false,
  setRefs: (refs) => set({ refs }),
  setLoadingRefs: (loadingRefs) => set({ loadingRefs }),

  selectedHash: initial.selectedHash,
  hoveredHash: undefined,
  scrollY: initial.scrollY ?? 0,
  select: (hash) => set({ selectedHash: hash }),
  hover: (hash) => set({ hoveredHash: hash }),
  setScrollY: (scrollY) => set({ scrollY }),

  presetId: initial.presetId ?? "git-graph-like",
  algorithmId: "rolling",
  rendererId: "hybrid-canvas-wide",
  rowHeight: initial.rowHeight ?? 28,
  columns: normalizeColumns(initial.columns) ?? DEFAULT_COLUMNS,
  refDisplay: (initial.refDisplay as RefDisplay) ?? "inline",
  dateFormat: "relative",
  showWorkingTree: true,
  topoOrder: true,
  pageSize: 500,
  setPreset: (presetId) => {
    const preset = getPreset(presetId as never);
    if (!preset) {
      set({ presetId });
      return;
    }
    set({
      presetId,
      algorithmId: preset.algorithmId,
      rendererId: preset.rendererId,
      rowHeight: preset.defaultRowHeight,
      columns: preset.defaultColumns.map((c) => ({ ...c })),
      refDisplay: preset.defaultRefDisplay,
    });
  },
  setAlgorithm: (algorithmId) => set({ algorithmId }),
  setRenderer: (rendererId) => set({ rendererId }),
  setRowHeight: (rowHeight) => set({ rowHeight }),
  setColumns: (columns) => set({ columns }),
  toggleColumn: (id) =>
    set((state) => ({
      columns: state.columns.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    })),
  setRefDisplay: (refDisplay) => set({ refDisplay }),
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setShowWorkingTree: (showWorkingTree) => set({ showWorkingTree }),
  setTopoOrder: (topoOrder) => set({ topoOrder }),
  setPageSize: (pageSize) => set({ pageSize }),
  applyConfig: (values) =>
    set((state) => {
      const next: Partial<Store> = {};
      if (typeof values.graphStyle === "string") next.presetId = values.graphStyle;
      if (typeof values.rowHeight === "number") next.rowHeight = values.rowHeight;
      if (typeof values.refDisplay === "string") next.refDisplay = values.refDisplay as RefDisplay;
      if (typeof values.dateFormat === "string") next.dateFormat = values.dateFormat as DateFormat;
      if (typeof values.showWorkingTree === "boolean")
        next.showWorkingTree = values.showWorkingTree;
      if (typeof values.topoOrder === "boolean") next.topoOrder = values.topoOrder;
      if (typeof values.pageSize === "number") next.pageSize = values.pageSize;
      const cols = normalizeColumns(values.columns);
      if (cols) next.columns = cols;
      return { ...state, ...next };
    }),

  preferencesOpen: false,
  setPreferencesOpen: (preferencesOpen) => set({ preferencesOpen }),
}));

const PERSIST_KEYS: ReadonlyArray<keyof Store> = [
  "selectedHash",
  "scrollY",
  "presetId",
  "refDisplay",
  "rowHeight",
  "columns",
];

const flush = debounce((state: Store) => {
  const slice: PersistedState = {};
  for (const k of PERSIST_KEYS) {
    const value = state[k];
    if (value !== undefined) (slice as Record<string, unknown>)[k] = value as never;
  }
  adapter.set(slice);
}, 100);

useStore.subscribe((state, prev) => {
  let changed = false;
  for (const k of PERSIST_KEYS) {
    if (state[k] !== prev[k]) {
      changed = true;
      break;
    }
  }
  if (changed) flush(state);
});
