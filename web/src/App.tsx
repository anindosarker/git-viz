import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { CommitList } from "./components/CommitList/CommitList";
import { TopBar } from "./components/TopBar/TopBar";
import useGit from "./hooks/useGit";
import { gitService } from "./services/git.service";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { commits, loading, error, fetchLog } = useGit();
  const rowHeight = 36;
  const { data: repoInfo } = useQuery({
    queryKey: ["repoInfo"],
    queryFn: () => gitService.getRepoInfo(),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="p-4 min-h-screen bg-background text-foreground flex flex-col pt-0">
      {repoInfo && (
        <TopBar
          repo={repoInfo.name}
          branch={repoInfo.head.branch ?? repoInfo.head.shortHash}
          onRefresh={() => fetchLog()}
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
          <CommitList commits={commits} rowHeight={rowHeight} loading={loading} />
        </div>
      </div>
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
