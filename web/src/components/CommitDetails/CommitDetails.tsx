import type { GitFileChange, GitRefPointer } from "@git-viz/shared";
import React from "react";
import { useCommitDetails } from "../../hooks/useCommitDetails";
import { getVsCodeApi } from "../../services/vscodeApi";
import { useStore } from "../../state/store";
import { CommitBody } from "./CommitBody";
import { CommitHeader } from "./CommitHeader";
import { CommitMeta } from "./CommitMeta";
import { FileChangeList } from "./FileChangeList";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 800;

export const CommitDetails: React.FC = () => {
  const selectedHash = useStore((s) => s.selectedHash);
  const commits = useStore((s) => s.commits);
  const refsSnapshot = useStore((s) => s.refs);
  const height = useStore((s) => s.detailsHeight);
  const setHeight = useStore((s) => s.setDetailsHeight);
  const select = useStore((s) => s.select);
  const openDiffViewer = useStore((s) => s.openDiffViewer);

  const commit = React.useMemo(
    () => commits.find((c) => c.hash === selectedHash),
    [commits, selectedHash]
  );

  const refsForCommit = React.useMemo<GitRefPointer[]>(() => {
    if (!commit || !refsSnapshot) return [];
    const out: GitRefPointer[] = [];
    for (const b of refsSnapshot.branches) {
      if (b.tip === commit.hash) {
        out.push({
          type: b.isRemote ? "remote-branch" : "branch",
          name: b.name,
          commitHash: b.tip,
          isHead: b.isHead,
        });
      }
    }
    for (const t of refsSnapshot.tags) {
      if (t.target === commit.hash) {
        out.push({ type: "tag", name: t.name, commitHash: t.target });
      }
    }
    return out;
  }, [commit, refsSnapshot]);

  const state = useCommitDetails(selectedHash);

  React.useEffect(() => {
    if (!selectedHash) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        if (useStore.getState().preferencesOpen) return;
        if (useStore.getState().diffViewer) return;
        e.preventDefault();
        select(undefined);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedHash, select]);

  const onResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = height;
      const onMove = (ev: MouseEvent) => {
        const dy = startY - ev.clientY;
        const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + dy));
        setHeight(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [height, setHeight]
  );

  const onOpenFile = React.useCallback(
    (file: GitFileChange) => {
      if (!selectedHash) return;
      const api = getVsCodeApi();
      if (api) {
        api.postMessage({
          command: "diff:openFile",
          payload: {
            hash: selectedHash,
            path: file.path,
            oldPath: file.oldPath,
            status: file.status,
          },
        });
      } else {
        openDiffViewer(selectedHash, file.path);
      }
    },
    [selectedHash, openDiffViewer]
  );

  if (!commit || !selectedHash) return null;

  return (
    <div
      className="shrink-0 border-t bg-background flex flex-col relative"
      style={{ height }}
      data-testid="commit-details-drawer"
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 right-0 h-1 -mt-0.5 cursor-row-resize hover:bg-primary/40 z-10"
        title="Drag to resize"
      />
      <CommitHeader commit={commit} body={state?.details?.body} onClose={() => select(undefined)} />
      <CommitMeta commit={commit} details={state?.details} refs={refsForCommit} />
      <div className="overflow-auto shrink-0">
        <CommitBody body={state?.details?.body} loading={state?.detailsLoading} />
      </div>
      <FileChangeList
        files={state?.files}
        truncated={state?.filesTruncated ?? false}
        loading={state?.filesLoading ?? false}
        error={state?.filesError}
        onOpenFile={onOpenFile}
      />
    </div>
  );
};
