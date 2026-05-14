import type {
  DiffHunk,
  GitBranch,
  GitCommitDetails,
  GitCommitSummary,
  GitFileChange,
  GitHeadState,
  GitRefPointer,
  GitRefsSnapshot,
  GitRemote,
  GitRepoInfo,
  GitStash,
  GitTag,
} from "@git-viz/shared";

export type {
  DiffHunk,
  GitBranch,
  GitCommitDetails,
  GitCommitSummary,
  GitFileChange,
  GitHeadState,
  GitRefPointer,
  GitRefsSnapshot,
  GitRemote,
  GitRepoInfo,
  GitStash,
  GitTag,
};

export interface CommitRow extends GitCommitSummary {
  color?: string;
  authorAvatar?: string;
  refs: GitRefPointer[];
  kind?: "HEAD" | "node" | "working-tree" | "stash";
}
