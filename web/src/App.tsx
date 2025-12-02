import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommitGraph } from "./components/Graph/CommitGraph";
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

      <div className="border rounded-md flex overflow-hidden">
        {/* Graph Container */}
        <div className="flex-shrink-0 bg-background border-r">
          <div className="h-10 border-b bg-muted/50"></div>{" "}
          {/* Header spacer */}
          <CommitGraph commits={commits} />
        </div>

        {/* Table Container */}
        <div className="flex-grow overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hash</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commits.map((commit) => (
                <TableRow key={commit.hash} className="h-[24px]">
                  {" "}
                  {/* Enforce row height */}
                  <TableCell className="font-mono text-xs py-1 h-[24px]">
                    {commit.hash.substring(0, 7)}
                  </TableCell>
                  <TableCell className="py-1 h-[24px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                    {commit.message}
                  </TableCell>
                  <TableCell className="py-1 h-[24px]">
                    <span
                      className="text-xs font-medium truncate block max-w-[150px]"
                      title={`${commit.author} <${commit.email}>`}
                    >
                      {commit.author}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground py-1 h-[24px]">
                    {new Date(commit.date).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && commits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No commits found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
