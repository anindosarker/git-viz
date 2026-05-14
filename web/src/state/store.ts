import type {
  CommitFilter,
  CommitsGetPageResponse,
  GitCommitSummary,
  GitRefsSnapshot,
} from "@git-viz/shared";
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
  filterMenuOpen: boolean;
  setFilterMenuOpen: (open: boolean) => void;
  refPanelOpen: boolean;
  setRefPanelOpen: (open: boolean) => void;
}

interface FilterSlice {
  query: string;
  queryRegex: boolean;
  author: string | null;
  since: string | null;
  until: string | null;
  paths: string[];
  hash: string | null;
  refScope: string[];
  setQuery: (q: string) => void;
  setQueryRegex: (v: boolean) => void;
  setAuthor: (v: string | null) => void;
  setSince: (v: string | null) => void;
  setUntil: (v: string | null) => void;
  setPaths: (v: string[]) => void;
  setHash: (v: string | null) => void;
  setRefScope: (v: string[]) => void;
  toggleRefScope: (refName: string) => void;
  clearFilters: () => void;
}

export type Store = CommitsSlice & RefsSlice & SelectionSlice & ViewSlice & UISlice & FilterSlice;

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
  filterMenuOpen: false,
  setFilterMenuOpen: (filterMenuOpen) => set({ filterMenuOpen }),
  refPanelOpen: false,
  setRefPanelOpen: (refPanelOpen) => set({ refPanelOpen }),

  query: initial.query ?? "",
  queryRegex: initial.queryRegex ?? false,
  author: initial.author ?? null,
  since: initial.since ?? null,
  until: initial.until ?? null,
  paths: initial.paths ?? [],
  hash: null,
  refScope: initial.refScope ?? [],
  setQuery: (query) => set({ query }),
  setQueryRegex: (queryRegex) => set({ queryRegex }),
  setAuthor: (author) => set({ author }),
  setSince: (since) => set({ since }),
  setUntil: (until) => set({ until }),
  setPaths: (paths) => set({ paths }),
  setHash: (hash) => set({ hash }),
  setRefScope: (refScope) => set({ refScope }),
  toggleRefScope: (refName) =>
    set((state) => {
      const idx = state.refScope.indexOf(refName);
      if (idx === -1) return { refScope: [...state.refScope, refName] };
      const next = state.refScope.slice();
      next.splice(idx, 1);
      return { refScope: next };
    }),
  clearFilters: () =>
    set({
      query: "",
      queryRegex: false,
      author: null,
      since: null,
      until: null,
      paths: [],
      hash: null,
      refScope: [],
    }),
}));

export function selectActiveFilters(state: Store): {
  hasActiveFilters: boolean;
  apiFilter: CommitFilter;
} {
  const filter: CommitFilter = {};
  if (state.query) {
    filter.query = state.query;
    if (state.queryRegex) filter.queryRegex = true;
  }
  if (state.author) filter.author = state.author;
  if (state.since) filter.since = state.since;
  if (state.until) filter.until = state.until;
  if (state.paths.length > 0) filter.paths = state.paths;
  if (state.refScope.length > 0) filter.refs = state.refScope;
  if (state.hash) filter.hash = state.hash;
  return {
    apiFilter: filter,
    hasActiveFilters: Object.keys(filter).length > 0,
  };
}

const PERSIST_KEYS: ReadonlyArray<keyof Store> = [
  "selectedHash",
  "scrollY",
  "presetId",
  "refDisplay",
  "rowHeight",
  "columns",
  "query",
  "queryRegex",
  "author",
  "since",
  "until",
  "paths",
  "refScope",
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
