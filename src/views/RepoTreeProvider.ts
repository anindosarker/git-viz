import * as vscode from "vscode";
import { GitRefService } from "@git-viz/backend/GitRefService";
import { GitRemoteService } from "@git-viz/backend/GitRemoteService";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import { GitSubmoduleService } from "@git-viz/backend/GitSubmoduleService";
import { GitWorktreeService } from "@git-viz/backend/GitWorktreeService";
import type { GitRefsSnapshot, GitSubmodule, GitWorktree } from "@git-viz/shared";
import {
  BranchNode,
  BranchesGroup,
  HeadNode,
  RemoteNode,
  RemotesGroup,
  RepoNode,
  StashNode,
  StashesGroup,
  SubmoduleNode,
  SubmodulesGroup,
  TagNode,
  TagsGroup,
  WorktreeNode,
  WorktreesGroup,
  type TreeNode,
} from "./treeItems";

interface RepoEntry {
  name: string;
  cwd: string;
  refs?: GitRefsSnapshot;
  remoteNames?: string[];
  submodules?: GitSubmodule[];
  worktrees?: GitWorktree[];
  error?: string;
}

export class RepoTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly repos = new Map<string, RepoEntry>();
  /** Extra repos (e.g. submodules) opened via "Open Submodule". */
  private readonly extraRepos = new Map<string, string>();

  public refresh(): void {
    this.repos.clear();
    this._onDidChange.fire();
  }

  public addRepo(cwd: string, name?: string): void {
    this.extraRepos.set(cwd, name ?? cwd);
    this._onDidChange.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      return this.getRootRepos();
    }

    if (element instanceof RepoNode) {
      return this.getRepoChildren(element);
    }

    if (element instanceof BranchesGroup) {
      return element.branches.map((b) => new BranchNode(element.repoCwd, b));
    }
    if (element instanceof TagsGroup) {
      return element.tags.map((t) => new TagNode(element.repoCwd, t));
    }
    if (element instanceof StashesGroup) {
      return element.stashes.map((s) => new StashNode(element.repoCwd, s));
    }
    if (element instanceof RemotesGroup) {
      return element.remoteNames.map((name) => new RemoteNode(element.repoCwd, name));
    }
    if (element instanceof SubmodulesGroup) {
      return element.submodules.map((s) => new SubmoduleNode(element.repoCwd, s));
    }
    if (element instanceof WorktreesGroup) {
      return element.worktrees.map((w) => new WorktreeNode(element.repoCwd, w));
    }

    return [];
  }

  private async getRootRepos(): Promise<TreeNode[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const nodes: TreeNode[] = [];
    const seen = new Set<string>();
    for (const folder of folders) {
      const cwd = folder.uri.fsPath;
      const root = await GitRepoService.getRepoRoot(cwd);
      if (!root || seen.has(root)) continue;
      seen.add(root);
      let entry = this.repos.get(root);
      if (!entry) {
        entry = { name: folder.name, cwd: root };
        this.repos.set(root, entry);
      }
      nodes.push(new RepoNode(entry.name, entry.cwd, entry.refs));
    }
    for (const [extra, name] of this.extraRepos) {
      if (seen.has(extra)) continue;
      const root = await GitRepoService.getRepoRoot(extra);
      if (!root || seen.has(root)) continue;
      seen.add(root);
      let entry = this.repos.get(root);
      if (!entry) {
        entry = { name, cwd: root };
        this.repos.set(root, entry);
      }
      nodes.push(new RepoNode(entry.name, entry.cwd, entry.refs));
    }
    return nodes;
  }

  private async getRepoChildren(repoNode: RepoNode): Promise<TreeNode[]> {
    const entry = this.repos.get(repoNode.cwd) ?? {
      name: repoNode.repoName,
      cwd: repoNode.cwd,
    };

    if (!entry.refs) {
      try {
        entry.refs = await GitRefService.getAll(entry.cwd, true);
      } catch (err) {
        entry.error = err instanceof Error ? err.message : String(err);
      }
    }
    if (!entry.remoteNames) {
      try {
        const remotes = await GitRemoteService.list(entry.cwd);
        entry.remoteNames = remotes.map((r) => r.name);
      } catch {
        entry.remoteNames = [];
      }
    }
    if (!entry.submodules) {
      try {
        entry.submodules = await GitSubmoduleService.list(entry.cwd);
      } catch {
        entry.submodules = [];
      }
    }
    if (!entry.worktrees) {
      try {
        entry.worktrees = await GitWorktreeService.list(entry.cwd);
      } catch {
        entry.worktrees = [];
      }
    }
    this.repos.set(entry.cwd, entry);

    if (entry.error || !entry.refs) {
      const errItem = new vscode.TreeItem(
        entry.error ?? "Failed to load refs",
        vscode.TreeItemCollapsibleState.None
      );
      errItem.iconPath = new vscode.ThemeIcon("error");
      return [errItem as unknown as TreeNode];
    }

    const refs = entry.refs;
    const headLabel = refs.head.detached
      ? refs.head.shortHash
      : (refs.head.branch ?? refs.head.shortHash);

    const localBranches = refs.branches.filter((b) => !b.isRemote);

    const children: TreeNode[] = [
      new HeadNode(entry.cwd, headLabel, refs.head.hash, refs.head.detached),
      new BranchesGroup(entry.cwd, localBranches),
      new TagsGroup(entry.cwd, refs.tags),
      new StashesGroup(entry.cwd, refs.stashes),
      new RemotesGroup(entry.cwd, entry.remoteNames ?? []),
    ];
    if (entry.submodules && entry.submodules.length > 0) {
      children.push(new SubmodulesGroup(entry.cwd, entry.submodules));
    }
    if (entry.worktrees && entry.worktrees.length > 1) {
      // Only show the worktrees group if more than the main worktree exists.
      children.push(new WorktreesGroup(entry.cwd, entry.worktrees));
    }
    return children;
  }
}
