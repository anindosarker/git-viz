import { RepoSwitcher } from "@/components/TopBar/RepoSwitcher";
import { Button } from "@/components/ui/button";
import { gitActions } from "@/services/git-actions.service";
import { useActionsStore } from "@/state/actionsStore";
import { useStore } from "@/state/store";
import {
  ChevronRight,
  Download,
  FolderGit2,
  GitBranch,
  MoreHorizontal,
  RotateCw,
  Settings,
  Upload,
} from "lucide-react";
import React from "react";
import { runAction } from "../Actions/runAction";

interface BreadcrumbRowProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  onSwitchRepo: (id: string) => void;
  loading: boolean;
  lastFetchAt?: number;
}

function formatRelative(ts?: number): string {
  if (!ts) return "";
  const delta = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function BreadcrumbRow({
  repo,
  branch,
  onRefresh,
  onSwitchRepo,
  loading,
  lastFetchAt,
}: BreadcrumbRowProps) {
  const setPreferencesOpen = useStore((s) => s.setPreferencesOpen);
  const openModal = useActionsStore((s) => s.openModal);
  const openConfirm = useActionsStore((s) => s.openConfirm);
  const repos = useStore((s) => s.repos);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  // Tick once per minute so "Xm ago" stays current.
  React.useEffect(() => {
    if (!lastFetchAt) return;
    const id = window.setInterval(() => force(), 30_000);
    return () => window.clearInterval(id);
  }, [lastFetchAt]);

  const setLastFetchAt = useStore((s) => s.setLastFetchAt);
  const fetchAll = async () => {
    await runAction("Fetch all remotes", () => gitActions.remoteFetch({}));
    setLastFetchAt(Date.now());
  };
  const pull = () =>
    openConfirm({
      title: "Pull",
      description: `Pull from upstream into ${branch}? Uses fast-forward strategy.`,
      confirmLabel: "Pull",
      onConfirm: async () => {
        await runAction(`Pull ${branch}`, () => gitActions.remotePull({ strategy: "ff" }));
      },
    });
  const push = () => openModal({ kind: "push", context: { branch } });

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted/30 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {repos.length > 0 ? (
          <RepoSwitcher onSwitch={onSwitchRepo} />
        ) : (
          <div className="flex items-center gap-1.5 font-medium truncate">
            <FolderGit2 className="h-3.5 w-3.5" />
            <span className="truncate">{repo}</span>
          </div>
        )}
        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1.5 truncate">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate font-medium">{branch}</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAll}
          title="Fetch all remotes"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Fetch</span>
          {lastFetchAt ? (
            <span className="text-muted-foreground">({formatRelative(lastFetchAt)})</span>
          ) : null}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={pull}
          title="Pull"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Download className="h-3.5 w-3.5 rotate-90" />
          Pull
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={push}
          title="Push"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Upload className="h-3.5 w-3.5" />
          Push
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMoreOpen((v) => !v)}
            title="More actions"
            aria-label="More actions"
            className="h-7 w-7"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden />
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-md border bg-background p-1 shadow-md">
                <MoreItem
                  label="Stash changes…"
                  onClick={() => {
                    setMoreOpen(false);
                    openModal({ kind: "stash-create" });
                  }}
                />
                <MoreItem
                  label="Create branch…"
                  onClick={() => {
                    setMoreOpen(false);
                    openModal({ kind: "branch-create" });
                  }}
                />
                <MoreItem
                  label="Create tag…"
                  onClick={() => {
                    setMoreOpen(false);
                    openModal({ kind: "tag-create" });
                  }}
                />
                <MoreItem
                  label="Merge…"
                  onClick={() => {
                    setMoreOpen(false);
                    openModal({ kind: "merge" });
                  }}
                />
                <MoreItem
                  label="Rebase…"
                  onClick={() => {
                    setMoreOpen(false);
                    openModal({ kind: "rebase" });
                  }}
                />
                <div className="my-1 h-px bg-border" />
                <MoreItem
                  label="Abort merge"
                  onClick={() => {
                    setMoreOpen(false);
                    void runAction("Abort merge", () => gitActions.mergeAbort());
                  }}
                />
                <MoreItem
                  label="Abort rebase"
                  onClick={() => {
                    setMoreOpen(false);
                    void runAction("Abort rebase", () => gitActions.rebaseAbort());
                  }}
                />
                <MoreItem
                  label="Continue rebase"
                  onClick={() => {
                    setMoreOpen(false);
                    void runAction("Continue rebase", () => gitActions.rebaseContinue());
                  }}
                />
              </div>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Log"
          className="h-7 w-7"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPreferencesOpen(true)}
          title="Preferences"
          aria-label="Open preferences"
          className="h-7 w-7"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>

        <span
          className="ml-1 inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: "var(--gitviz-badge-head-bg)",
            color: "var(--gitviz-badge-head-fg)",
          }}
          title="Pro features"
        >
          Pro
        </span>
      </div>
    </div>
  );
}

const MoreItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground"
  >
    {label}
  </button>
);
