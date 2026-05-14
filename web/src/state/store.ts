import type { CommitsGetPageResponse, GitCommitSummary, GitRefsSnapshot } from "@git-viz/shared";
import { create } from "zustand";
import { debounce, getPersistAdapter, type PersistedState } from "./persist";

export type RefDisplay = "inline" | "left-column" | "right-column";
export type DateFormat = "relative" | "absolute" | "iso";

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
  rowHeight: number;
  refDisplay: RefDisplay;
  dateFormat: DateFormat;
  showWorkingTree: boolean;
  topoOrder: boolean;
  pageSize: number;
  columns: string[];
  setPreset: (id: string) => void;
  setRowHeight: (h: number) => void;
  setRefDisplay: (d: RefDisplay) => void;
  setDateFormat: (f: DateFormat) => void;
  setShowWorkingTree: (v: boolean) => void;
  setTopoOrder: (v: boolean) => void;
  setPageSize: (n: number) => void;
  setColumns: (c: string[]) => void;
  applyConfig: (values: Record<string, unknown>) => void;
}

interface UISlice {
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
  detailsHeight: number;
  setDetailsHeight: (h: number) => void;
  diffViewer?: { hash: string; path: string };
  openDiffViewer: (hash: string, path: string) => void;
  closeDiffViewer: () => void;
}

export type Store = CommitsSlice & RefsSlice & SelectionSlice & ViewSlice & UISlice;

const DEFAULT_COLUMNS = ["graph", "subject", "refs", "author", "date", "hash"];

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
  rowHeight: initial.rowHeight ?? 36,
  refDisplay: (initial.refDisplay as RefDisplay) ?? "left-column",
  dateFormat: "relative",
  showWorkingTree: true,
  topoOrder: true,
  pageSize: 500,
  columns: initial.columns ?? DEFAULT_COLUMNS,
  setPreset: (presetId) => set({ presetId }),
  setRowHeight: (rowHeight) => set({ rowHeight }),
  setRefDisplay: (refDisplay) => set({ refDisplay }),
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setShowWorkingTree: (showWorkingTree) => set({ showWorkingTree }),
  setTopoOrder: (topoOrder) => set({ topoOrder }),
  setPageSize: (pageSize) => set({ pageSize }),
  setColumns: (columns) => set({ columns }),
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
      if (Array.isArray(values.columns))
        next.columns = values.columns.filter((c): c is string => typeof c === "string");
      return { ...state, ...next };
    }),

  preferencesOpen: false,
  setPreferencesOpen: (preferencesOpen) => set({ preferencesOpen }),
  detailsHeight: initial.detailsHeight ?? 320,
  setDetailsHeight: (detailsHeight) => set({ detailsHeight }),
  diffViewer: undefined,
  openDiffViewer: (hash, path) => set({ diffViewer: { hash, path } }),
  closeDiffViewer: () => set({ diffViewer: undefined }),
}));

const PERSIST_KEYS: ReadonlyArray<keyof Store> = [
  "selectedHash",
  "scrollY",
  "presetId",
  "refDisplay",
  "rowHeight",
  "columns",
  "detailsHeight",
];

const flush = debounce((state: Store) => {
  const slice: PersistedState = {};
  for (const k of PERSIST_KEYS) {
    const value = state[k];
    if (value !== undefined) (slice as Record<string, unknown>)[k] = value;
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
