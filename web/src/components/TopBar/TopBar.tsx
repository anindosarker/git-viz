import { GitBranch, RotateCw, Settings } from "lucide-react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { RepoSwitcher } from "./RepoSwitcher";

interface TopBarProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  onSwitchRepo: (id: string) => void;
  loading: boolean;
}

export function TopBar({ repo, branch, onRefresh, onSwitchRepo, loading }: TopBarProps) {
  const setPreferencesOpen = useStore((s) => s.setPreferencesOpen);
  const repos = useStore((s) => s.repos);

  return (
    <div className="flex items-center justify-between bg-muted/40 p-2 border-b text-sm">
      <div className="flex items-center gap-4">
        {repos.length > 0 ? (
          <RepoSwitcher onSwitch={onSwitchRepo} />
        ) : (
          <div className="font-medium">{repo}</div>
        )}
        <div className="text-muted-foreground">{">"}</div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>{branch}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Log"
        >
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPreferencesOpen(true)}
          title="Preferences"
          aria-label="Open preferences"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
