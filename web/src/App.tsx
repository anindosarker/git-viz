import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommitList } from "./components/CommitList/CommitList";
import { Button } from "./components/ui/button";
import useGit from "./hooks/useGit.hook";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { commits, loading, error, fetchLog } = useGit();
  const rowHeight = 36;

  return (
    <div className="p-4 min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-bold">Git Graph Visualization</h1>
        <Button onClick={() => fetchLog()} disabled={loading}>
          {loading ? "Loading..." : "Refresh Log"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 shrink-0">
          Error: {error}
        </div>
      )}

      <div className="border rounded-md flex overflow-hidden grow">
        <div className="grow overflow-auto">
          <CommitList
            commits={commits}
            rowHeight={rowHeight}
            loading={loading}
          />
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
