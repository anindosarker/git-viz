import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "./components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import useGit from "./hooks/useGit.hook";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { commits, loading, error, fetchLog } = useGit();

  return (
    <div className="p-4 min-h-screen bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Git Graph Visualization</h1>
        <Button onClick={() => fetchLog()} disabled={loading}>
          {loading ? "Loading..." : "Refresh Log"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
          Error: {error}
        </div>
      )}

      <div className="border rounded-md">
        <div className="relative">
          {/* Graph Overlay (Absolute Positioned) - To be implemented properly later */}
          {/* For now, we'll just put it in a separate column or overlay logic */}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Graph</TableHead>
              <TableHead className="w-[100px]">Hash</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commits.map((commit, index) => (
              <TableRow key={commit.hash}>
                <TableCell className="p-0 relative w-[50px]">
                  {/* 
                     We render a small slice of the graph for each row, 
                     or we could render the whole graph as an underlay/overlay.
                     For simplicity in this step, let's just render a dot.
                     Real implementation will need a different layout strategy.
                   */}
                  <svg width="50" height="40" className="absolute top-0 left-0">
                    <circle cx="25" cy="20" r="4" fill="currentColor" />
                  </svg>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {commit.hash.substring(0, 7)}
                </TableCell>
                <TableCell>{commit.message}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{commit.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {commit.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(commit.date).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {!loading && commits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No commits found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
