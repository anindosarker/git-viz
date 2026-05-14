import { ActionsRoot } from "@/components/Actions";
import { CommitDetails } from "@/components/CommitDetails/CommitDetails";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";
import { CommitTable } from "@/components/Graph/CommitTable";
import { ActivityTimeline } from "@/components/Timeline/ActivityTimeline";
import { PreferencesPanel } from "@/components/PreferencesPanel/PreferencesPanel";
import { FilterChips } from "@/components/Search/FilterChips";
import { FilterMenu } from "@/components/Search/FilterMenu";
import { RefFilter } from "@/components/Search/RefFilter";
import { TopBar } from "@/components/TopBar/TopBar";
import "@/graph/columns/author.column";
import "@/graph/columns/graph.column";
import "@/graph/columns/subject.column";
import "@/graph/render/hybrid-canvas-wide";
import useGit from "@/hooks/useGit";
import { useConfigBridge } from "@/hooks/useConfigBridge";
import { useGitEvents } from "@/hooks/useGitEvents";
import { useGitInvalidation } from "@/hooks/useGitInvalidation";
import { useGraph } from "@/hooks/useGraph";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useThemeSync } from "@/hooks/useThemeSync";
import { gitService } from "@/services/git.service";
import { useStore } from "@/state/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { loading, error, refresh, loadNextPage } = useGit();
  const innerQueryClient = useQueryClient();
  const setRepos = useStore((s) => s.setRepos);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const activeRepoId = useStore((s) => s.activeRepoId);

  useConfigBridge();
  useThemeSync();
  useKeyboardNav();
  useGitInvalidation(refresh);

  const { data: repoList } = useQuery({
    queryKey: ["repos"],
    queryFn: () => gitService.listRepos(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!repoList) return;
    setRepos(repoList);
    if (repoList.length > 0) {
      const hasActive = activeRepoId && repoList.some((r) => r.id === activeRepoId);
      if (!hasActive) {
        const defaultId = repoList[0].id;
        gitService.setRepoId(defaultId);
        setActiveRepo(defaultId);
      } else {
        gitService.setRepoId(activeRepoId);
      }
    }
  }, [repoList, setRepos, setActiveRepo, activeRepoId]);

  const handleSwitchRepo = useCallback(
    (id: string) => {
      gitService.setRepoId(id);
      setActiveRepo(id);
      innerQueryClient.invalidateQueries();
      void refresh();
    },
    [setActiveRepo, innerQueryClient, refresh]
  );

  const handleGitEvent = useCallback(
    (kinds: string[]) => {
      const set = new Set(kinds);
      if (set.has("commits") || set.has("refs") || set.has("head") || set.has("stashes")) {
        void refresh();
        innerQueryClient.invalidateQueries({ queryKey: ["repoInfo"] });
        innerQueryClient.invalidateQueries({ queryKey: ["repos"] });
      } else if (set.has("workingTree")) {
        innerQueryClient.invalidateQueries({ queryKey: ["repoInfo"] });
      }
    },
    [refresh, innerQueryClient]
  );

  useGitEvents({ onChange: handleGitEvent });

  const { data: repoInfo } = useQuery({
    queryKey: ["repoInfo", activeRepoId],
    queryFn: () => gitService.getRepoInfo(),
    refetchOnWindowFocus: false,
  });

  const { rows } = useGraph({ workingTreeDirty: repoInfo?.hasUncommittedChanges });
  const query = useStore((s) => s.query);
  const commits = useStore((s) => s.commits);
  const selectedHash = useStore((s) => s.selectedHash);
  const select = useStore((s) => s.select);
  const lastFetchAt = useStore((s) => s.lastFetchAt);
  const matchCount = query.trim() ? commits.length : undefined;

  const handleJumpToMatch = useCallback(
    (direction: "prev" | "next") => {
      if (commits.length === 0) return;
      const currentIdx = selectedHash ? commits.findIndex((c) => c.hash === selectedHash) : -1;
      let nextIdx: number;
      if (direction === "next") {
        nextIdx = currentIdx < 0 ? 0 : Math.min(commits.length - 1, currentIdx + 1);
      } else {
        nextIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
      }
      select(commits[nextIdx]?.hash);
    },
    [commits, selectedHash, select]
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {repoInfo && (
        <TopBar
          repo={repoInfo.name}
          branch={repoInfo.head.branch ?? repoInfo.head.shortHash}
          onRefresh={() => void refresh()}
          onSwitchRepo={handleSwitchRepo}
          loading={loading}
          lastFetchAt={lastFetchAt}
          matchCount={matchCount}
          onJumpToMatch={handleJumpToMatch}
        />
      )}

      <FilterChips />
      <ActivityTimeline />

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 m-4 rounded-md">Error: {error}</div>
      )}

      <div className="grow overflow-hidden border-t flex flex-col min-h-0">
        <div className="grow overflow-hidden min-h-0 flex">
          <RefFilter />
          <div className="grow overflow-hidden min-h-0">
            <CommitTable rows={rows} loading={loading} onEndReached={() => void loadNextPage()} />
          </div>
        </div>
        <CommitDetails />
      </div>

      <PreferencesPanel />
      <DiffViewer />
      <FilterMenu />
      <ActionsRoot />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <GitGraphApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
