import { BreadcrumbRow } from "@/components/TopBar/BreadcrumbRow";
import { SearchRow } from "@/components/TopBar/SearchRow";
import "@/graph/presets/git-graph-like";
import "@/graph/presets/gitlens-like";
import "@/graph/presets/vscode-scm-graph-like";

interface TopBarProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  onSwitchRepo: (id: string) => void;
  loading: boolean;
  lastFetchAt?: number;
  matchCount?: number;
  onJumpToMatch?: (direction: "prev" | "next") => void;
}

export function TopBar({
  repo,
  branch,
  onRefresh,
  onSwitchRepo,
  loading,
  lastFetchAt,
  matchCount,
  onJumpToMatch,
}: TopBarProps) {
  return (
    <div className="flex flex-col border-b bg-muted/40">
      <BreadcrumbRow
        repo={repo}
        branch={branch}
        onRefresh={onRefresh}
        onSwitchRepo={onSwitchRepo}
        loading={loading}
        lastFetchAt={lastFetchAt}
      />
      <SearchRow matchCount={matchCount} onJumpToMatch={onJumpToMatch} />
    </div>
  );
}
