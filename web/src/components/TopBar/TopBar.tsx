import {
  Download,
  FolderGit2,
  GitBranch,
  MoreHorizontal,
  RotateCw,
  Settings,
  Upload,
} from "lucide-react";
import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { useStore } from "../../state/store";
import { runAction } from "../Actions/runAction";
import { Button } from "../ui/button";

interface TopBarProps {
  repo: string;
  branch: string;
  onRefresh: () => void;
  loading: boolean;
}

export function TopBar({ repo, branch, onRefresh, loading }: TopBarProps) {
  const setPreferencesOpen = useStore((s) => s.setPreferencesOpen);
  const openModal = useActionsStore((s) => s.openModal);
  const openConfirm = useActionsStore((s) => s.openConfirm);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const fetchAll = () => runAction("Fetch all remotes", () => gitActions.remoteFetch({}));
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

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={fetchAll} title="Fetch all remotes">
          <Download className="h-4 w-4" />
          Fetch
        </Button>
        <Button variant="ghost" size="sm" onClick={pull} title="Pull">
          <Download className="h-4 w-4 rotate-90" />
          Pull
        </Button>
        <Button variant="ghost" size="sm" onClick={push} title="Push">
          <Upload className="h-4 w-4" />
          Push
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMoreOpen((v) => !v)}
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
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

const MoreItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground"
  >
    {label}
  </button>
);
