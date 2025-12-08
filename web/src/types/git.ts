import type { GitCommit as CoreGitCommit } from "@git-viz/shared";

export interface GitCommit extends CoreGitCommit {
  color?: string;
  authorAvatar?: string; // Optional: URL to author's avatar image
  body?: string; // Full commit message body
  stats?: {
    files: number;
    additions: number;
    deletions: number;
  };
}

export interface GitLogResponse {
  command: "responseLog";
  data: GitCommit[];
}
