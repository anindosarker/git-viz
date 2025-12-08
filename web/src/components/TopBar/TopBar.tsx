import { FolderGit2, GitBranch, RotateCw } from "lucide-react";
import { Button } from "../ui/button";

interface TopBarProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  loading: boolean;
}

export function TopBar({ repo, branch, onRefresh, loading }: TopBarProps) {
  return (
    <div className="flex items-center justify-between bg-muted/40 p-2 border-b text-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-medium">
          <FolderGit2 className="h-4 w-4" />
          <span>{repo}</span>
        </div>
        <div className="text-muted-foreground">{">"}</div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>{branch}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={loading}
        title="Refresh Log"
      >
        <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
