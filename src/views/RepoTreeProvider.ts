import * as vscode from "vscode";
import { GitRefService } from "@git-viz/backend/GitRefService";
import { GitRemoteService } from "@git-viz/backend/GitRemoteService";
import { GitRepoService } from "@git-viz/backend/GitRepoService";
import type { GitRefsSnapshot } from "@git-viz/shared";
import {
  BranchNode,
  BranchesGroup,
  HeadNode,
  RemoteNode,
  RemotesGroup,
  RepoNode,
  StashNode,
  StashesGroup,
  TagNode,
  TagsGroup,
  type TreeNode,
} from "./treeItems";

interface RepoEntry {
  name: string;
  cwd: string;
  refs?: GitRefsSnapshot;
  remoteNames?: string[];
  error?: string;
}

export class RepoTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly repos = new Map<string, RepoEntry>();

  public refresh(): void {
    this.repos.clear();
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

    return [];
  }

  private async getRootRepos(): Promise<TreeNode[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const nodes: TreeNode[] = [];
    for (const folder of folders) {
      const cwd = folder.uri.fsPath;
      const root = await GitRepoService.getRepoRoot(cwd);
      if (!root) continue;
      let entry = this.repos.get(root);
      if (!entry) {
        entry = { name: folder.name, cwd: root };
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

    return [
      new HeadNode(entry.cwd, headLabel, refs.head.hash, refs.head.detached),
      new BranchesGroup(entry.cwd, localBranches),
      new TagsGroup(entry.cwd, refs.tags),
      new StashesGroup(entry.cwd, refs.stashes),
      new RemotesGroup(entry.cwd, entry.remoteNames ?? []),
    ];
  }
}
