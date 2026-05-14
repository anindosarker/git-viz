import type { CommitRow, GitRefPointer } from "@/types/git";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CommitList } from "./components/CommitList/CommitList";
import { TopBar } from "./components/TopBar/TopBar";
import useGit from "./hooks/useGit";
import { gitService } from "./services/git.service";
import { useStore } from "./state/store";

const queryClient = new QueryClient();

function GitGraphApp() {
  const { loading, error, refresh } = useGit();
  const commits = useStore((s) => s.commits);
  const refs = useStore((s) => s.refs);
  const rowHeight = useStore((s) => s.rowHeight);

  const { data: repoInfo } = useQuery({
    queryKey: ["repoInfo"],
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
