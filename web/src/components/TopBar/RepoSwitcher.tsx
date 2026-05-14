import { ChevronDown, FolderGit2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RepoSummary } from "@git-viz/shared";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";

interface RepoSwitcherProps {
  onSwitch: (repoId: string) => void;
}

/**
 * Dropdown in the top bar that lists all repos served by the backend and
 * switches the active one. Falls back to displaying the current repo name
 * when only one is available.
 */
export function RepoSwitcher({ onSwitch }: RepoSwitcherProps) {
  const repos = useStore((s) => s.repos);
  const activeRepoId = useStore((s) => s.activeRepoId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const active: RepoSummary | undefined = repos.find((r) => r.id === activeRepoId) ?? repos[0];

  if (repos.length === 0) {
    return null;
  }

  if (repos.length === 1) {
    return (
      <div className="flex items-center gap-2 font-medium">
        <FolderGit2 className="h-4 w-4" />
        <span title={active?.path}>{active?.name}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} className="gap-2 px-2">
        <FolderGit2 className="h-4 w-4" />
        <span className="font-medium">{active?.name ?? "Select repo"}</span>
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 min-w-[260px] rounded-md border bg-popover p-1 shadow-md">
          {repos.map((repo) => {
            const isActive = repo.id === activeRepoId;
            return (
              <button
                key={repo.id}
                type="button"
                className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${
                  isActive ? "bg-accent/60 font-medium" : ""
                }`}
                onClick={() => {
                  setOpen(false);
                  onSwitch(repo.id);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{repo.name}</span>
                  {repo.hasUncommittedChanges && (
                    <span className="text-amber-500 text-xs" title="Uncommitted changes">
                      ●
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">{repo.path}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
