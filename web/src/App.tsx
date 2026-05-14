import { ActionsRoot } from "@/components/Actions";
import { CommitDetails } from "@/components/CommitDetails/CommitDetails";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";
import { CommitTable } from "@/components/Graph/CommitTable";
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
import { useGitInvalidation } from "@/hooks/useGitInvalidation";
import { useGraph } from "@/hooks/useGraph";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useThemeSync } from "@/hooks/useThemeSync";
import { gitService } from "@/services/git.service";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { loading, error, refresh, loadNextPage } = useGit();

  useConfigBridge();
  useThemeSync();
  useKeyboardNav();
  useGitInvalidation(refresh);

  const { data: repoInfo } = useQuery({
    queryKey: ["repoInfo"],
    queryFn: () => gitService.getRepoInfo(),
    refetchOnWindowFocus: false,
  });

  const { rows } = useGraph({ workingTreeDirty: repoInfo?.hasUncommittedChanges });

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {repoInfo && (
        <TopBar
          repo={repoInfo.name}
          branch={repoInfo.head.branch ?? repoInfo.head.shortHash}
          onRefresh={() => void refresh()}
          loading={loading}
        />
      )}

      <FilterChips />

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
      <GitGraphApp />
    </QueryClientProvider>
  );
}

export default App;
