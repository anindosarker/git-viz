import { SearchBar } from "@/components/Search/SearchBar";
import { Button } from "@/components/ui/button";
import { presetRegistry } from "@/graph";
import { selectActiveFilters, useStore } from "@/state/store";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Filter,
  GitBranch,
  LineChart,
  ListFilter,
} from "lucide-react";
import React from "react";

interface SearchRowProps {
  onJumpToMatch?: (direction: "prev" | "next") => void;
  matchCount?: number;
}

export function SearchRow({ onJumpToMatch, matchCount }: SearchRowProps) {
  const setFilterMenuOpen = useStore((s) => s.setFilterMenuOpen);
  const refPanelOpen = useStore((s) => s.refPanelOpen);
  const setRefPanelOpen = useStore((s) => s.setRefPanelOpen);
  const hasActiveFilters = useStore((s) => selectActiveFilters(s).hasActiveFilters);
  const presetId = useStore((s) => s.presetId);
  const setPreset = useStore((s) => s.setPreset);
  const presets = Array.from(presetRegistry.values());
  const refScope = useStore((s) => s.refScope);
  const setRefScope = useStore((s) => s.setRefScope);

  const [branchesOpen, setBranchesOpen] = React.useState(false);
  const branchesRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!branchesOpen) return;
    const handle = (event: MouseEvent) => {
      if (!branchesRef.current) return;
      if (!branchesRef.current.contains(event.target as Node)) setBranchesOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [branchesOpen]);

  const scopeLabel =
    refScope.length === 0
      ? "All branches"
      : refScope.length === 1
        ? refScope[0]
        : `${refScope.length} refs`;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b text-xs bg-muted/40">
      <div ref={branchesRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBranchesOpen((v) => !v)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="truncate max-w-[140px]">{scopeLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        {branchesOpen && (
          <div className="absolute z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
            <button
              type="button"
              className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${
                refScope.length === 0 ? "bg-accent/60 font-medium" : ""
              }`}
              onClick={() => {
                setRefScope([]);
                setBranchesOpen(false);
              }}
            >
              All branches
            </button>
            <button
              type="button"
              className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setBranchesOpen(false);
                setRefPanelOpen(true);
              }}
            >
              Filter by ref…
            </button>
          </div>
        )}
      </div>

      <Button
        variant={hasActiveFilters ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setFilterMenuOpen(true)}
        title="Open filter menu"
        aria-label="Open filter menu"
        className="h-7 w-7"
      >
        <Filter className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1 max-w-2xl">
        <SearchBar matchCount={matchCount} onJumpToMatch={onJumpToMatch} />
      </div>

      <Button
        variant={refPanelOpen ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setRefPanelOpen(!refPanelOpen)}
        title="Toggle ref filter panel"
        aria-label="Toggle ref filter panel"
        className="h-7 w-7"
      >
        <ListFilter className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Previous match"
        aria-label="Previous match"
        className="h-7 w-7"
        onClick={() => onJumpToMatch?.("prev")}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Next match"
        aria-label="Next match"
        className="h-7 w-7"
        onClick={() => onJumpToMatch?.("next")}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Open in new window (coming soon)"
        aria-label="Open in new window"
        className="h-7 w-7"
        onClick={() => {
          /* stub */
        }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>

      <label
        className="flex items-center gap-1 text-[11px] text-muted-foreground"
        title="Graph style"
      >
        <LineChart className="h-3.5 w-3.5" />
        <select
          value={presetId}
          onChange={(e) => setPreset(e.target.value)}
          className="bg-background border rounded-sm px-1 py-0.5 text-[11px]"
          aria-label="Graph style"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
