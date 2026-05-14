import * as vscode from "vscode";
import { GitBranchService } from "@git-viz/backend/GitBranchService";
import { GitRepoService } from "@git-viz/backend/GitRepoService";

const POLL_INTERVAL_MS = 5000;

export class StatusBarItem implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private timer: NodeJS.Timeout | undefined;
  private disposed = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "git-viz.showCommitGraph";
    this.item.name = "Git Viz";
    this.item.text = "$(git-branch) git-viz";
  }

  public start(): void {
    this.item.show();
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  public async refresh(): Promise<void> {
    if (this.disposed) return;
    const cwd = this.firstWorkspaceCwd();
    if (!cwd) {
      this.item.hide();
      return;
    }
    try {
      const repoInfo = await GitRepoService.getRepoInfo(cwd);
      if (!repoInfo.root) {
        this.item.hide();
        return;
      }
      const head = repoInfo.head;
      const label = head.detached ? head.shortHash : (head.branch ?? head.shortHash);
      let aheadBehind = "";
      let upstream: string | undefined;
      if (!head.detached && head.branch) {
        try {
          const branches = await GitBranchService.list(repoInfo.root, false);
          const match = branches.find((b) => b.name === head.branch);
          if (match?.upstream) {
            upstream = match.upstream;
            const ahead = match.ahead ?? 0;
            const behind = match.behind ?? 0;
            if (ahead > 0 || behind > 0) {
              aheadBehind = ` ↑${ahead} ↓${behind}`;
            }
          }
        } catch {
          // ignore
        }
      }
      this.item.text = `$(git-branch) ${label}${aheadBehind}`;
      const tooltipLines = [
        `Repo: ${repoInfo.name}`,
        head.detached
          ? `Detached HEAD @ ${head.shortHash}`
          : `Branch: ${head.branch ?? head.shortHash}`,
        `Commit: ${head.hash}`,
      ];
      if (upstream) tooltipLines.push(`Upstream: ${upstream}`);
      if (repoInfo.hasUncommittedChanges) tooltipLines.push("Uncommitted changes");
      this.item.tooltip = tooltipLines.join("\n");
      this.item.show();
    } catch {
      this.item.hide();
    }
  }

  private firstWorkspaceCwd(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
  }

  public dispose(): void {
    this.disposed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.item.dispose();
  }
}
