export interface GitCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  refs: string[];
  message: string;
}

export interface GitLogResponse {
  command: "responseLog";
  data: GitCommit[];
}
