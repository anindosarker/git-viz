import type { CommitRow, GitRefPointer } from "@/types/git";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { CommitList } from "./components/CommitList/CommitList";
import { PreferencesPanel } from "./components/PreferencesPanel/PreferencesPanel";
import { TopBar } from "./components/TopBar/TopBar";
import useGit from "./hooks/useGit";
import { useConfigBridge } from "./hooks/useConfigBridge";
import { useGitEvents } from "./hooks/useGitEvents";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useThemeSync } from "./hooks/useThemeSync";
import { gitService } from "./services/git.service";
import { useStore } from "./state/store";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { loading, error, refresh } = useGit();
  const queryClient = useQueryClient();
  const commits = useStore((s) => s.commits);
  const refs = useStore((s) => s.refs);
  const rowHeight = useStore((s) => s.rowHeight);
  const setRepos = useStore((s) => s.setRepos);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const activeRepoId = useStore((s) => s.activeRepoId);

  useConfigBridge();
  useThemeSync();
  useKeyboardNav();

  const { data: repoList } = useQuery({
    queryKey: ["repos"],
    queryFn: () => gitService.listRepos(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!repoList) return;
    setRepos(repoList);
    // Pick a default active repo if none was persisted or persisted one is gone.
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
      queryClient.invalidateQueries();
      void refresh();
    },
    [setActiveRepo, queryClient, refresh]
  );

  const handleGitEvent = useCallback(
    (kinds: string[]) => {
      // Coarse-grained invalidation: any of these kinds means we should refresh
      // the visible state. Future work: only invalidate slices per kind.
      const set = new Set(kinds);
      if (set.has("commits") || set.has("refs") || set.has("head") || set.has("stashes")) {
        void refresh();
        queryClient.invalidateQueries({ queryKey: ["repoInfo"] });
        queryClient.invalidateQueries({ queryKey: ["repos"] });
      } else if (set.has("workingTree")) {
        queryClient.invalidateQueries({ queryKey: ["repoInfo"] });
      }
    },
    [refresh, queryClient]
  );

  useGitEvents({ onChange: handleGitEvent });

  const { data: repoInfo } = useQuery({
    queryKey: ["repoInfo", activeRepoId],
    queryFn: () => gitService.getRepoInfo(),
    refetchOnWindowFocus: false,
  });

  const rows: CommitRow[] = useMemo(() => {
    const byHash = new Map<string, GitRefPointer[]>();
    const push = (ref: GitRefPointer) => {
      const list = byHash.get(ref.commitHash) ?? [];
      list.push(ref);
      byHash.set(ref.commitHash, list);
    };
    if (refs) {
      for (const b of refs.branches) {
        push({
          type: b.isRemote ? "remote-branch" : "branch",
          name: b.name,
          commitHash: b.tip,
          isHead: b.isHead,
        });
      }
      for (const t of refs.tags) {
        push({ type: "tag", name: t.name, commitHash: t.target });
      }
      if (refs.head && !refs.head.detached) {
        push({
          type: "head",
          name: refs.head.branch ?? "HEAD",
          commitHash: refs.head.hash,
          isHead: true,
        });
      }
    }
    return commits.map((c) => ({ ...c, refs: byHash.get(c.hash) ?? [] }));
  }, [commits, refs]);

  return (
    <div className="p-4 min-h-screen bg-background text-foreground flex flex-col pt-0">
      {repoInfo && (
        <TopBar
          repo={repoInfo.name}
          branch={repoInfo.head.branch ?? repoInfo.head.shortHash}
          onRefresh={() => void refresh()}
          onSwitchRepo={handleSwitchRepo}
          loading={loading}
        />
      )}

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 shrink-0">
          Error: {error}
        </div>
      )}

      <div className="border rounded-md flex overflow-hidden grow">
        <div className="grow overflow-auto">
          <CommitList commits={rows} rowHeight={rowHeight} loading={loading} />
        </div>
      </div>

      <PreferencesPanel />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GitGraphApp />
    </QueryClientProvider>
  );
}

export default App;
