import type { ColumnConfig, ColumnId } from "@/graph/columns/types";
import { getPreset } from "@/graph/presets/registry";
import type { RefDisplay } from "@/graph/presets/types";
import type { SortingState } from "@tanstack/react-table";
import type {
  CommitFilter,
  CommitsGetPageResponse,
  GitCommitSummary,
  GitRefsSnapshot,
  RepoSummary,
} from "@git-viz/shared";
import { create } from "zustand";
import { debounce, getPersistAdapter, type PersistedState, type PersistedRoot } from "./persist";

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
  sorting: SortingState;
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
  setSorting: (s: SortingState) => void;
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

interface RepoSlice {
  activeRepoId?: string;
  repos: RepoSummary[];
  setActiveRepo: (id: string) => void;
  setRepos: (repos: RepoSummary[]) => void;
}

export type Store = CommitsSlice &
  RefsSlice &
  SelectionSlice &
  ViewSlice &
  UISlice &
  FilterSlice &
  RepoSlice;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "graph", visible: true, width: "flex" },
  { id: "subject", visible: true, width: "flex", refsInline: true },
  { id: "date", visible: true, width: 150 },
  { id: "author", visible: true, width: 200 },
  { id: "hash", visible: true, width: 80 },
];

function normalizeSorting(raw: unknown): SortingState | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SortingState = [];
  for (const item of raw) {
    if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
      out.push({
        id: (item as { id: string }).id,
        desc: !!(item as { desc?: boolean }).desc,
      });
    }
  }
  return out;
}

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
const persistedRoot: PersistedRoot = adapter.get();
const initialActiveRepoId = persistedRoot.activeRepoId;
const initial: PersistedState =
  (initialActiveRepoId !== undefined
    ? persistedRoot.perRepo?.[initialActiveRepoId]
    : persistedRoot.perRepo?.[""]) ?? {};

function applyRepoSliceToState(slice: PersistedState): Partial<Store> {
  return {
    selectedHash: slice.selectedHash,
    scrollY: slice.scrollY ?? 0,
    presetId: slice.presetId ?? "git-graph-like",
    refDisplay: (slice.refDisplay as RefDisplay) ?? "inline",
    rowHeight: slice.rowHeight ?? 28,
    columns: normalizeColumns(slice.columns) ?? DEFAULT_COLUMNS,
  };
}

export const useStore = create<Store>()((set, get) => ({
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
  sorting: normalizeSorting(initial.sorting) ?? [],
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
  setSorting: (sorting) => set({ sorting }),
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
  detailsHeight: initial.detailsHeight ?? 320,
  setDetailsHeight: (detailsHeight) => set({ detailsHeight }),
  diffViewer: undefined,
  openDiffViewer: (hash, path) => set({ diffViewer: { hash, path } }),
  closeDiffViewer: () => set({ diffViewer: undefined }),
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

  activeRepoId: initialActiveRepoId,
  repos: [],
  setActiveRepo: (id) => {
    const current = get().activeRepoId;
    if (current === id) {
      set({ activeRepoId: id });
      return;
    }
    flushImmediate(get());
    const root = adapter.get();
    const incoming = root.perRepo?.[id] ?? {};
    set({
      activeRepoId: id,
      ...applyRepoSliceToState(incoming),
      commits: [],
      hasMore: false,
      nextCursor: undefined,
      loading: false,
      refs: undefined,
      loadingRefs: false,
      hoveredHash: undefined,
    });
  },
  setRepos: (repos) => set({ repos }),
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
  "sorting",
  "detailsHeight",
  "query",
  "queryRegex",
  "author",
  "since",
  "until",
  "paths",
  "refScope",
];

function snapshotRepoSlice(state: Store): PersistedState {
  const slice: PersistedState = {};
  for (const k of PERSIST_KEYS) {
    const value = state[k];
    if (value !== undefined) (slice as Record<string, unknown>)[k] = value as never;
  }
  return slice;
}

function writeRoot(state: Store): void {
  const root = adapter.get();
  const repoId = state.activeRepoId ?? "";
  const perRepo = { ...(root.perRepo ?? {}) };
  perRepo[repoId] = snapshotRepoSlice(state);
  const next: PersistedRoot = {
    activeRepoId: state.activeRepoId,
    perRepo,
  };
  adapter.set(next);
}

function flushImmediate(state: Store): void {
  writeRoot(state);
}

const flush = debounce((state: Store) => writeRoot(state), 100);

useStore.subscribe((state, prev) => {
  let changed = false;
  for (const k of PERSIST_KEYS) {
    if (state[k] !== prev[k]) {
      changed = true;
      break;
    }
  }
  if (state.activeRepoId !== prev.activeRepoId) changed = true;
  if (changed) flush(state);
});
