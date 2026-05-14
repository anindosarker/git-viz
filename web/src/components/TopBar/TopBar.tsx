import { SearchBar } from "@/components/Search/SearchBar";
import { Button } from "@/components/ui/button";
import { presetRegistry } from "@/graph";
import "@/graph/presets/git-graph-like";
import "@/graph/presets/gitlens-like";
import "@/graph/presets/vscode-scm-graph-like";
import { selectActiveFilters, useStore } from "@/state/store";
import { Filter, FolderGit2, GitBranch, ListFilter, RotateCw, Settings } from "lucide-react";

interface TopBarProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  loading: boolean;
}

export function TopBar({ repo, branch, onRefresh, loading }: TopBarProps) {
  const presetId = useStore((s) => s.presetId);
  const setPreset = useStore((s) => s.setPreset);
  const setPreferencesOpen = useStore((s) => s.setPreferencesOpen);
  const presets = Array.from(presetRegistry.values());
  const setFilterMenuOpen = useStore((s) => s.setFilterMenuOpen);
  const refPanelOpen = useStore((s) => s.refPanelOpen);
  const setRefPanelOpen = useStore((s) => s.setRefPanelOpen);
  const hasActiveFilters = useStore((s) => selectActiveFilters(s).hasActiveFilters);

  return (
    <div className="flex items-center justify-between bg-muted/40 p-2 border-b text-sm gap-2">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 font-medium truncate">
          <FolderGit2 className="h-4 w-4" />
          <span className="truncate">{repo}</span>
        </div>
        <div className="text-muted-foreground">{">"}</div>
        <div className="flex items-center gap-2 truncate">
          <GitBranch className="h-4 w-4" />
          <span className="truncate">{branch}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <SearchBar />
        <Button
          variant={hasActiveFilters ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setFilterMenuOpen(true)}
          title="Open filter menu"
          aria-label="Open filter menu"
        >
          <Filter className="h-4 w-4" />
        </Button>
        <Button
          variant={refPanelOpen ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setRefPanelOpen(!refPanelOpen)}
          title="Toggle ref filter panel"
          aria-label="Toggle ref filter panel"
        >
          <ListFilter className="h-4 w-4" />
        </Button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Style
          <select
            value={presetId}
            onChange={(e) => setPreset(e.target.value)}
            className="bg-background border rounded-sm px-2 py-1 text-xs"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
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
