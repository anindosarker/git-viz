import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import React from "react";
import { gitService } from "../../services/git.service";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { DiffHunk } from "./DiffHunk";

export const DiffViewer: React.FC = () => {
  const diffViewer = useStore((s) => s.diffViewer);
  const close = useStore((s) => s.closeDiffViewer);

  React.useEffect(() => {
    if (!diffViewer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [diffViewer, close]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["commit:diff", diffViewer?.hash, diffViewer?.path],
    queryFn: () => gitService.getFileDiff(diffViewer!.hash, diffViewer!.path),
    enabled: !!diffViewer,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!diffViewer) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-background border rounded-md shadow-2xl w-full max-w-5xl max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <span className="font-mono text-xs">{diffViewer.path}</span>
          <span className="text-xs text-muted-foreground ml-2">
            at {diffViewer.hash.slice(0, 7)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-7 w-7"
            onClick={close}
            aria-label="Close diff"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-auto flex-1">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading diff…</div>}
          {error && (
            <div className="p-4 text-sm text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}
          {data && data.hunks.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No textual changes (binary, mode change, or empty diff).
            </div>
          )}
          {data && data.hunks.map((h, i) => <DiffHunk key={i} hunk={h} />)}
        </div>
      </div>
    </div>
  );
};
