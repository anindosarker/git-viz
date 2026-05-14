import { getPreset } from "@/graph";
import type { CommitFilter } from "@git-viz/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { gitService } from "../services/git.service";
import { selectActiveFilters, useStore } from "../state/store";

function resolveOrder(presetId: string, topoOrder: boolean): "topo" | "date" {
  if (topoOrder) return "topo";
  const preset = getPreset(presetId as never);
  if (preset?.algorithmId === "gitlens-topo") return "topo";
  return "date";
}

function shallowEqualFilter(a: CommitFilter, b: CommitFilter): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const av = (a as Record<string, unknown>)[k];
    const bv = (b as Record<string, unknown>)[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

export default function useGit() {
  const appendPage = useStore((s) => s.appendPage);
  const resetCommits = useStore((s) => s.resetCommits);
  const setCommitsLoading = useStore((s) => s.setCommitsLoading);
  const setRefs = useStore((s) => s.setRefs);
  const setLoadingRefs = useStore((s) => s.setLoadingRefs);
  const hasMore = useStore((s) => s.hasMore);
  const nextCursor = useStore((s) => s.nextCursor);
  const loading = useStore((s) => s.loading);
  const presetId = useStore((s) => s.presetId);
  const topoOrder = useStore((s) => s.topoOrder);

  const [error, setError] = useState<string | null>(null);
  const currentFilterRef = useRef<CommitFilter>({});
  const reqIdRef = useRef(0);

  const fetchFirstPage = useCallback(
    async (filter: CommitFilter) => {
      const reqId = ++reqIdRef.current;
      currentFilterRef.current = filter;
      try {
        setError(null);
        setCommitsLoading(true);
        resetCommits();
        const order = resolveOrder(presetId, topoOrder);
        const hasFilter = Object.keys(filter).length > 0;
        if (hasFilter) {
          const page = await gitService.getCommitsPage({ filter, order });
          if (reqId !== reqIdRef.current) return;
          appendPage(page);
        } else {
          const data = await gitService.bootstrap({ order });
          if (reqId !== reqIdRef.current) return;
          setRefs(data.refs);
          appendPage(data.firstPage);
        }
      } catch (e) {
        if (reqId !== reqIdRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (reqId === reqIdRef.current) setCommitsLoading(false);
      }
    },
    [appendPage, presetId, resetCommits, setCommitsLoading, setRefs, topoOrder]
  );

  const bootstrap = useCallback(async () => {
    try {
      setError(null);
      setLoadingRefs(true);
    } finally {
      setLoadingRefs(false);
    }
    await fetchFirstPage(selectActiveFilters(useStore.getState()).apiFilter);
  }, [fetchFirstPage, setLoadingRefs]);

  const loadRefs = useCallback(async () => {
    try {
      setLoadingRefs(true);
      const refs = await gitService.getRefs();
      setRefs(refs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRefs(false);
    }
  }, [setLoadingRefs, setRefs]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || !nextCursor || loading) return;
    try {
      setCommitsLoading(true);
      const order = resolveOrder(presetId, topoOrder);
      const filter = currentFilterRef.current;
      const page = await gitService.getCommitsPage({
        cursor: nextCursor,
        order,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });
      appendPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitsLoading(false);
    }
  }, [appendPage, hasMore, nextCursor, loading, presetId, setCommitsLoading, topoOrder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
    void loadRefs();
    let debounceHandle: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useStore.subscribe((state, prev) => {
      const next = selectActiveFilters(state).apiFilter;
      const previous = selectActiveFilters(prev).apiFilter;
      if (shallowEqualFilter(next, previous)) return;
      if (debounceHandle) clearTimeout(debounceHandle);
      debounceHandle = setTimeout(() => {
        debounceHandle = null;
        void fetchFirstPage(next);
      }, 300);
    });
    return () => {
      if (debounceHandle) clearTimeout(debounceHandle);
      unsubscribe();
    };
  }, [bootstrap, fetchFirstPage, loadRefs]);

  return { loading, error, loadNextPage, refresh: bootstrap };
}
