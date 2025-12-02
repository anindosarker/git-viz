export interface GitCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface GitLogResponse {
  command: "responseLog";
  data: GitCommit[];
}
