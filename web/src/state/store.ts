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

interface ViewSlice {
  presetId: string;
  rowHeight: number;
  setPreset: (id: string) => void;
  setRowHeight: (h: number) => void;
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
  rowHeight: 36,
  setPreset: (presetId) => set({ presetId }),
  setRowHeight: (rowHeight) => set({ rowHeight }),
}));
