import type { GitCommitSummary } from "@git-viz/shared";
import { X } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { CopyMenu } from "./CopyMenu";
import { RemoteLinkMenu } from "./RemoteLinkMenu";

interface CommitHeaderProps {
  commit: GitCommitSummary;
  body?: string;
  onClose: () => void;
}

export const CommitHeader: React.FC<CommitHeaderProps> = ({ commit, body, onClose }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
      <span className="font-mono text-xs text-muted-foreground select-all">
        {commit.hash.slice(0, 7)}
      </span>
      <span className="truncate text-sm font-medium" title={commit.subject}>
        {commit.subject}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <CopyMenu commit={commit} body={body} />
        <RemoteLinkMenu hash={commit.hash} />
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close details"
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
