import type { CommitRow } from "@/types/git";
import React from "react";

interface CommitDetailsProps {
  commit: CommitRow;
  contentPaddingLeft?: number;
}

export const CommitDetails: React.FC<CommitDetailsProps> = ({ commit, contentPaddingLeft = 0 }) => {
  return (
    <div
      className="p-4 bg-background border-b text-sm font-mono"
      style={{ paddingLeft: contentPaddingLeft + 16 }}
    >
      <div className="grid grid-cols-[100px_1fr] gap-y-1">
        <div className="text-muted-foreground">Commit:</div>
        <div className="select-all">{commit.hash}</div>

        <div className="text-muted-foreground">Parents:</div>
        <div className="select-all">{commit.parents.join(", ")}</div>

        <div className="text-muted-foreground">Author:</div>
        <div className="select-all">
          {commit.author} &lt;{commit.authorEmail}&gt;
        </div>

        <div className="text-muted-foreground">Committer:</div>
        <div className="select-all">
          {commit.committer} &lt;{commit.committerEmail}&gt;
        </div>

        <div className="text-muted-foreground">Date:</div>
        <div className="select-all">{commit.authorDate}</div>
      </div>

      <div className="mt-4 whitespace-pre-wrap select-text">{commit.subject}</div>
    </div>
  );
};
