import { useCallback, useEffect, useState } from "react";
import { gitService } from "../services/git.service";
import { useStore } from "../state/store";
import { getPreset } from "@/graph";

function resolveOrder(presetId: string, topoOrder: boolean): "topo" | "date" {
  if (topoOrder) return "topo";
  const preset = getPreset(presetId as never);
  if (preset?.algorithmId === "gitlens-topo") return "topo";
  return "date";
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

  const bootstrap = useCallback(async () => {
    try {
      setError(null);
      setCommitsLoading(true);
      setLoadingRefs(true);
      resetCommits();
      const order = resolveOrder(presetId, topoOrder);
      const data = await gitService.bootstrap({ order });
      setRefs(data.refs);
      appendPage(data.firstPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitsLoading(false);
      setLoadingRefs(false);
    }
  }, [appendPage, presetId, resetCommits, setCommitsLoading, setLoadingRefs, setRefs, topoOrder]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || !nextCursor || loading) return;
    try {
      setCommitsLoading(true);
      const order = resolveOrder(presetId, topoOrder);
      const page = await gitService.getCommitsPage({ cursor: nextCursor, order });
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
  }, [bootstrap]);

  return { loading, error, loadNextPage, refresh: bootstrap };
}
