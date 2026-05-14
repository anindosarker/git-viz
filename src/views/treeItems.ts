import * as vscode from "vscode";
import type { GitBranch, GitRefsSnapshot, GitStash, GitTag } from "@git-viz/shared";

export type TreeNode =
  | RepoNode
  | HeadNode
  | BranchesGroup
  | BranchNode
  | TagsGroup
  | TagNode
  | StashesGroup
  | StashNode
  | RemotesGroup
  | RemoteNode;

export class RepoNode extends vscode.TreeItem {
  readonly kind = "repo" as const;
  constructor(
    public readonly repoName: string,
    public readonly cwd: string,
    public readonly refs?: GitRefsSnapshot
  ) {
    super(repoName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "git-viz.repo";
    this.iconPath = new vscode.ThemeIcon("repo");
    this.tooltip = cwd;
  }
}

export class HeadNode extends vscode.TreeItem {
  readonly kind = "head" as const;
  constructor(
    public readonly repoCwd: string,
    label: string,
    public readonly hash: string,
    detached: boolean
  ) {
    super(`HEAD: ${label}`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(detached ? "git-commit" : "target");
    this.contextValue = "git-viz.head";
    this.tooltip = hash;
    this.command = {
      command: "git-viz.showCommitGraph",
      title: "Show Commit Graph",
      arguments: [{ kind: "head", hash }],
    };
  }
}

export class BranchesGroup extends vscode.TreeItem {
  readonly kind = "branchesGroup" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly branches: GitBranch[]
  ) {
    super(`Branches (${branches.length})`, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon("git-branch");
    this.contextValue = "git-viz.branches";
  }
}

export class BranchNode extends vscode.TreeItem {
  readonly kind = "branch" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly branch: GitBranch
  ) {
    const suffix = branch.isHead ? " (current)" : "";
    super(`${branch.name}${suffix}`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(branch.isRemote ? "cloud" : "git-branch");
    this.contextValue = branch.isRemote ? "git-viz.remoteBranch" : "git-viz.branch";
    const upstream = branch.upstream ? `\nupstream: ${branch.upstream}` : "";
    const aheadBehind =
      branch.ahead !== undefined || branch.behind !== undefined
        ? `\nahead ${branch.ahead ?? 0} / behind ${branch.behind ?? 0}`
        : "";
    this.tooltip = `${branch.name}${upstream}${aheadBehind}\ntip: ${branch.tip}`;
    this.description = branch.isHead ? "HEAD" : undefined;
    this.command = {
      command: "git-viz.showCommitGraph",
      title: "Show Commit Graph",
      arguments: [{ kind: "branch", name: branch.name, hash: branch.tip }],
    };
  }
}

export class TagsGroup extends vscode.TreeItem {
  readonly kind = "tagsGroup" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly tags: GitTag[]
  ) {
    super(`Tags (${tags.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("tag");
    this.contextValue = "git-viz.tags";
  }
}

export class TagNode extends vscode.TreeItem {
  readonly kind = "tag" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly tag: GitTag
  ) {
    super(tag.name, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("tag");
    this.contextValue = "git-viz.tag";
    this.tooltip = `${tag.name}\n${tag.target}${tag.message ? `\n${tag.message}` : ""}`;
    this.command = {
      command: "git-viz.showCommitGraph",
      title: "Show Commit Graph",
      arguments: [{ kind: "tag", name: tag.name, hash: tag.target }],
    };
  }
}

export class StashesGroup extends vscode.TreeItem {
  readonly kind = "stashesGroup" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly stashes: GitStash[]
  ) {
    super(`Stashes (${stashes.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("archive");
    this.contextValue = "git-viz.stashes";
  }
}

export class StashNode extends vscode.TreeItem {
  readonly kind = "stash" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly stash: GitStash
  ) {
    super(stash.name, vscode.TreeItemCollapsibleState.None);
    this.description = stash.message;
    this.iconPath = new vscode.ThemeIcon("archive");
    this.contextValue = "git-viz.stash";
    this.tooltip = `${stash.name}\n${stash.message}\n${stash.date}`;
    this.command = {
      command: "git-viz.showCommitGraph",
      title: "Show Commit Graph",
      arguments: [{ kind: "stash", name: stash.name, hash: stash.hash }],
    };
  }
}

export class RemotesGroup extends vscode.TreeItem {
  readonly kind = "remotesGroup" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly remoteNames: string[]
  ) {
    super(`Remotes (${remoteNames.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("cloud");
    this.contextValue = "git-viz.remotes";
  }
}

export class RemoteNode extends vscode.TreeItem {
  readonly kind = "remote" as const;
  constructor(
    public readonly repoCwd: string,
    public readonly remoteName: string
  ) {
    super(remoteName, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("cloud");
    this.contextValue = "git-viz.remote";
  }
}
