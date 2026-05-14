// Shared git data types for git-viz.
// Single source of truth for the backend + transports + frontend.

export interface GitCommitSummary {
  hash: string;
  parents: string[];
  author: string;
  authorEmail: string;
  authorDate: string; // ISO 8601
  committer: string;
  committerEmail: string;
  committerDate: string; // ISO 8601
  subject: string;
  // refs intentionally NOT embedded — fetched via refs:getAll, merged client-side
}

/** @deprecated Use GitCommitSummary. Kept as a transition alias for the existing frontend. */
export type GitCommit = GitCommitSummary;

export interface GitRefPointer {
  type: "branch" | "remote-branch" | "tag" | "head" | "stash";
  name: string; // e.g. "main", "origin/main", "v1.0", "HEAD"
  commitHash: string;
  isHead?: boolean;
}

export interface GitBranch {
  name: string;
  tip: string; // commit hash
  isHead: boolean;
  isRemote: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
  lastCommitDate: string;
}

export interface GitTag {
  name: string;
  target: string; // commit hash (peeled for annotated tags)
  annotated: boolean;
  message?: string;
  taggerDate?: string;
}

export interface GitStash {
  name: string; // e.g. "stash@{0}"
  hash: string;
  message: string;
  date: string;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitHeadState {
  detached: boolean;
  branch?: string;
  hash: string;
  shortHash: string;
}

export interface GitRefsSnapshot {
  head: GitHeadState;
  branches: GitBranch[];
  tags: GitTag[];
  stashes: GitStash[];
}

export interface GitFileChange {
  path: string;
  oldPath?: string; // for renames / copies
  status: "A" | "M" | "D" | "R" | "C" | "T";
  insertions: number;
  deletions: number;
}

export interface GitCommitDetails {
  hash: string;
  body: string;
  signature: {
    status: "good" | "bad" | "untrusted" | "none";
    signer?: string;
  };
  stats: { files: number; insertions: number; deletions: number };
}

export interface GitRepoInfo {
  name: string;
  root: string;
  head: GitHeadState;
  hasUncommittedChanges: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: Array<{ kind: "context" | "add" | "del"; text: string }>;
}

export interface CommitFilter {
  query?: string;
  queryRegex?: boolean;
  author?: string;
  since?: string;
  until?: string;
  paths?: string[];
  refs?: string[];
  hash?: string;
}

// Request / response envelopes — small thin types per endpoint.

export interface CommitsGetPageRequest {
  cursor?: string;
  limit: number;
  refs?: string[];
  order?: "topo" | "date";
  filter?: CommitFilter;
}

export interface CommitsGetPageResponse {
  commits: GitCommitSummary[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface BootstrapResponse {
  repo: GitRepoInfo;
  refs: GitRefsSnapshot;
  firstPage: CommitsGetPageResponse;
}
