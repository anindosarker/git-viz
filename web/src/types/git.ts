export interface GitCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  refs: string[];
  message: string;
  color?: string;
}

export interface GitLogResponse {
  command: "responseLog";
  data: GitCommit[];
}
