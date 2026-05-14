import type { GitActionResult } from "@git-viz/shared";
import { makeTransport, type Transport } from "./transport";

export interface BranchCreateParams {
  name: string;
  startPoint?: string;
  checkout?: boolean;
}
export interface BranchRenameParams {
  from: string;
  to: string;
}
export interface BranchDeleteParams {
  name: string;
  force?: boolean;
}
export interface BranchSetUpstreamParams {
  branch: string;
  upstream: string;
}
export interface CheckoutRefParams {
  ref: string;
  force?: boolean;
}
export interface MergeParams {
  ref: string;
  noFF?: boolean;
  message?: string;
}
export interface RebaseParams {
  onto: string;
}
export interface CherryPickParams {
  hashes: string[];
  annotate?: boolean;
}
export interface RevertParams {
  hash: string;
  edit?: boolean;
}
export interface ResetParams {
  mode: "soft" | "mixed" | "hard";
  target: string;
}
export interface TagCreateParams {
  name: string;
  target?: string;
  annotated?: boolean;
  message?: string;
}
export interface TagDeleteParams {
  name: string;
}
export interface TagPushParams {
  name: string;
  remote: string;
}
export interface StashCreateParams {
  message?: string;
  includeUntracked?: boolean;
}
export interface StashRefParams {
  ref: string;
}
export interface StashBranchParams {
  ref: string;
  branchName: string;
}
export interface RemoteFetchParams {
  remote?: string;
}
export interface RemotePullParams {
  strategy: "ff" | "merge" | "rebase";
}
export interface RemotePushParams {
  branch?: string;
  remote?: string;
  force?: boolean;
  tags?: boolean;
}
export interface RemoteAddParams {
  name: string;
  url: string;
}
export interface RemoteRemoveParams {
  name: string;
}
export interface RemoteRenameParams {
  from: string;
  to: string;
}

export class GitActionsService {
  public readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  private call<P>(command: string, payload?: P): Promise<GitActionResult> {
    return this.transport.request<GitActionResult>(command, payload);
  }

  branchCreate(p: BranchCreateParams) {
    return this.call("actions:branch:create", p);
  }
  branchRename(p: BranchRenameParams) {
    return this.call("actions:branch:rename", p);
  }
  branchDelete(p: BranchDeleteParams) {
    return this.call("actions:branch:delete", p);
  }
  branchSetUpstream(p: BranchSetUpstreamParams) {
    return this.call("actions:branch:setUpstream", p);
  }

  checkoutRef(p: CheckoutRefParams) {
    return this.call("actions:checkout:ref", p);
  }

  merge(p: MergeParams) {
    return this.call("actions:merge", p);
  }
  mergeAbort() {
    return this.call("actions:merge:abort", {});
  }
  rebase(p: RebaseParams) {
    return this.call("actions:rebase", p);
  }
  rebaseAbort() {
    return this.call("actions:rebase:abort", {});
  }
  rebaseContinue() {
    return this.call("actions:rebase:continue", {});
  }
  cherryPick(p: CherryPickParams) {
    return this.call("actions:cherryPick", p);
  }
  revert(p: RevertParams) {
    return this.call("actions:revert", p);
  }
  reset(p: ResetParams) {
    return this.call("actions:reset", p);
  }

  tagCreate(p: TagCreateParams) {
    return this.call("actions:tag:create", p);
  }
  tagDelete(p: TagDeleteParams) {
    return this.call("actions:tag:delete", p);
  }
  tagPush(p: TagPushParams) {
    return this.call("actions:tag:push", p);
  }

  stashCreate(p: StashCreateParams) {
    return this.call("actions:stash:create", p);
  }
  stashApply(p: StashRefParams) {
    return this.call("actions:stash:apply", p);
  }
  stashPop(p: StashRefParams) {
    return this.call("actions:stash:pop", p);
  }
  stashDrop(p: StashRefParams) {
    return this.call("actions:stash:drop", p);
  }
  stashBranch(p: StashBranchParams) {
    return this.call("actions:stash:branch", p);
  }

  remoteFetch(p: RemoteFetchParams = {}) {
    return this.call("actions:remote:fetch", p);
  }
  remotePull(p: RemotePullParams) {
    return this.call("actions:remote:pull", p);
  }
  remotePush(p: RemotePushParams = {}) {
    return this.call("actions:remote:push", p);
  }
  remoteAdd(p: RemoteAddParams) {
    return this.call("actions:remote:add", p);
  }
  remoteRemove(p: RemoteRemoveParams) {
    return this.call("actions:remote:remove", p);
  }
  remoteRename(p: RemoteRenameParams) {
    return this.call("actions:remote:rename", p);
  }
}

export const gitActions = new GitActionsService(makeTransport());

// Re-export the legacy clipboard helper still used by the CommitList.
export const legacyGitActions = {
  copyCommitHash(hash: string): void {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(hash);
    }
  },
};
