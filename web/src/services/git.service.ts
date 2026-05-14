import type {
  BootstrapResponse,
  CommitFilter,
  CommitsGetPageResponse,
  DiffHunk,
  GitCommitDetails,
  GitCommitSummary,
  GitFileChange,
  GitRefsSnapshot,
  GitRemote,
  GitRepoInfo,
  GitSubmodule,
  GitWorktree,
  RepoSummary,
} from "@git-viz/shared";
import { makeTransport, type Transport } from "./transport";

export interface CommitsPageRequest {
  cursor?: string;
  limit?: number;
  order?: "topo" | "date";
  filter?: CommitFilter;
}

export class GitService {
  public readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  bootstrap(limit?: number): Promise<BootstrapResponse> {
    return this.transport.request("bootstrap", limit !== undefined ? { limit } : undefined);
  }

  getRepoInfo(): Promise<GitRepoInfo> {
    return this.transport.request("repo:getInfo");
  }

  getCommitsPage(req: CommitsPageRequest = {}): Promise<CommitsGetPageResponse> {
    return this.transport.request("commits:getPage", req);
  }

  getCommit(hash: string): Promise<GitCommitSummary | null> {
    return this.transport.request("commits:getCommit", { hash });
  }

  getCommitDetails(hash: string): Promise<GitCommitDetails> {
    return this.transport.request("commits:getDetails", { hash });
  }

  getFileChanges(hash: string): Promise<{ files: GitFileChange[]; truncated: boolean }> {
    return this.transport.request("commits:getFileChanges", { hash });
  }

  getFileDiff(hash: string, path: string): Promise<{ hunks: DiffHunk[] }> {
    return this.transport.request("commits:getFileDiff", { hash, path });
  }

  getPatch(hash: string): Promise<string> {
    return this.transport.request("commits:getPatch", { hash });
  }

  getRefs(includeRemote = true): Promise<GitRefsSnapshot> {
    return this.transport.request("refs:getAll", { includeRemote });
  }

  getRemotes(): Promise<GitRemote[]> {
    return this.transport.request("remotes:list");
  }

  listRepos(): Promise<RepoSummary[]> {
    return this.transport.request("repos:list");
  }

  listSubmodules(): Promise<GitSubmodule[]> {
    return this.transport.request("submodules:list");
  }

  listWorktrees(): Promise<GitWorktree[]> {
    return this.transport.request("worktrees:list");
  }

  getRepoId(): string | undefined {
    return this.transport.getRepoId?.();
  }

  setRepoId(id: string): void {
    this.transport.setRepoId?.(id);
  }
}

export const gitService = new GitService(makeTransport());
