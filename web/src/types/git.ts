export interface GitCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  refs: string[];
  message: string;
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
