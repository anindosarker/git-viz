import type { CommitsGetPageResponse, GitCommitSummary, GitRefsSnapshot } from "@git-viz/shared";
import { create } from "zustand";

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
  select: (hash?: string) => void;
  hover: (hash?: string) => void;
}

import type { ColumnConfig } from "@/graph/columns/types";
import type { RefDisplay } from "@/graph/presets/types";

interface ViewSlice {
  presetId: string;
  algorithmId: string;
  rendererId: string;
  rowHeight: number;
  columns: ColumnConfig[];
  refDisplay: RefDisplay;
  setPreset: (id: string) => void;
  setAlgorithm: (id: string) => void;
  setRenderer: (id: string) => void;
  setRowHeight: (h: number) => void;
  setColumns: (cols: ColumnConfig[]) => void;
  toggleColumn: (id: ColumnConfig["id"]) => void;
  setRefDisplay: (mode: RefDisplay) => void;
}

export type Store = CommitsSlice & RefsSlice & SelectionSlice & ViewSlice;

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

  selectedHash: undefined,
  hoveredHash: undefined,
  select: (hash) => set({ selectedHash: hash }),
  hover: (hash) => set({ hoveredHash: hash }),

  presetId: "git-graph-like",
  algorithmId: "rolling",
  rendererId: "hybrid-canvas-wide",
  rowHeight: 28,
  columns: [
    { id: "graph", visible: true, width: "flex" },
    { id: "subject", visible: true, width: "flex", refsInline: true },
    { id: "date", visible: true, width: 150 },
    { id: "author", visible: true, width: 200 },
    { id: "hash", visible: true, width: 80 },
  ],
  refDisplay: "inline",
  setPreset: (presetId) => set({ presetId }),
  setAlgorithm: (algorithmId) => set({ algorithmId }),
  setRenderer: (rendererId) => set({ rendererId }),
  setRowHeight: (rowHeight) => set({ rowHeight }),
  setColumns: (columns) => set({ columns }),
  toggleColumn: (id) =>
    set((state) => ({
      columns: state.columns.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    })),
  setRefDisplay: (refDisplay) => set({ refDisplay }),
}));
