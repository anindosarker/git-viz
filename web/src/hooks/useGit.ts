import { useCallback, useEffect, useState } from "react";
import { gitService } from "../services/git.service";
import { useStore } from "../state/store";

export default function useGit() {
  const appendPage = useStore((s) => s.appendPage);
  const resetCommits = useStore((s) => s.resetCommits);
  const setCommitsLoading = useStore((s) => s.setCommitsLoading);
  const setRefs = useStore((s) => s.setRefs);
  const setLoadingRefs = useStore((s) => s.setLoadingRefs);
  const hasMore = useStore((s) => s.hasMore);
  const nextCursor = useStore((s) => s.nextCursor);
  const loading = useStore((s) => s.loading);

  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      setError(null);
      setCommitsLoading(true);
      setLoadingRefs(true);
      resetCommits();
      const data = await gitService.bootstrap();
      setRefs(data.refs);
      appendPage(data.firstPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitsLoading(false);
      setLoadingRefs(false);
    }
  }, [appendPage, resetCommits, setCommitsLoading, setLoadingRefs, setRefs]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || !nextCursor) return;
    try {
      setCommitsLoading(true);
      const page = await gitService.getCommitsPage({ cursor: nextCursor });
      appendPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitsLoading(false);
    }
  }, [appendPage, hasMore, nextCursor, setCommitsLoading]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return { loading, error, loadNextPage, refresh: bootstrap };
}
