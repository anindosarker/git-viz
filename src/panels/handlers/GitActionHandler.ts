import * as vscode from "vscode";
import { GitService } from "../../services/GitService";

export class GitActionHandler {
  private readonly _webview: vscode.Webview;

  constructor(webview: vscode.Webview) {
    this._webview = webview;
  }

  private async getRootPath(): Promise<string | undefined> {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage("No workspace folder open");
    return undefined;
  }

  public async handleCheckoutCommit(commitHash: string) {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    const shortHash = commitHash.substring(0, 7);

    const items: vscode.QuickPickItem[] = [
      {
        label: "$(check) Checkout to Commit",
        description: "(detached)",
        detail: `Will checkout to commit $(git-commit) ${shortHash}`,
      },
      {
        label: "$(git-branch) Create & Switch to New Branch from Commit",
        description: "Branch",
        detail: `Will create and switch to a new branch from commit $(git-commit) ${shortHash}`,
      },
    ];

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: `Confirm Switch to Commit ${shortHash}`,
    });

    if (!selection) return;

    try {
      if (selection.label.includes("Checkout to Commit")) {
        await GitService.checkout(rootPath, commitHash);
        vscode.window.showInformationMessage(`Checked out commit ${shortHash}`);
      } else if (selection.label.includes("Create & Switch")) {
        const branchName = await vscode.window.showInputBox({
          prompt: "Enter new branch name",
          placeHolder: "e.g., feature/my-new-branch",
        });
        if (branchName) {
          await GitService.createBranch(rootPath, branchName, commitHash);
          await GitService.checkout(rootPath, branchName);
          vscode.window.showInformationMessage(
            `Created and checked out branch ${branchName}`
          );
        }
      }
      this._webview.postMessage({ command: "refreshLog" });
    } catch (e: any) {
      vscode.window.showErrorMessage(`Failed to checkout commit: ${e.message}`);
    }
  }

  public async handleCheckoutBranch(branchName: string) {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    const picker = vscode.window.createQuickPick();
    picker.placeholder = `Confirm Switch to Branch ${branchName}`;
    picker.items = [
      {
        label: "$(check) Switch to Branch",
        description: branchName,
        detail: `Will switch to branch $(git-branch) ${branchName}`,
      },
      {
        label: "$(file-submodule) Create Worktree for Branch...",
        description: "avoids modifying your working tree",
        detail: `Will create a new worktree for branch $(git-branch) ${branchName}`,
      },
    ];

    picker.buttons = [vscode.QuickInputButtons.Back];

    picker.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        picker.hide();
        vscode.commands.executeCommand("git.checkout");
      }
    });

    picker.onDidAccept(async () => {
      const selection = picker.selectedItems[0];
      picker.hide();

      if (!selection) return;

      try {
        if (selection.label.includes("Switch to Branch")) {
          await GitService.checkout(rootPath, branchName);
          vscode.window.showInformationMessage(
            `Checked out branch ${branchName}`
          );
          this._webview.postMessage({ command: "refreshLog" });
        } else if (selection.label.includes("Create Worktree")) {
          vscode.window.showInformationMessage(
            "Worktree creation is not yet implemented."
          );
        }
      } catch (e: any) {
        vscode.window.showErrorMessage(
          `Failed to checkout branch: ${e.message}`
        );
      }
    });

    picker.show();
  }

  public async handleDeleteBranch(branchName: string) {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    const answer = await vscode.window.showWarningMessage(
      `Are you sure you want to delete branch '${branchName}'?`,
      { modal: true },
      "Delete"
    );
    if (answer === "Delete") {
      try {
        await GitService.deleteBranch(rootPath, branchName);
        vscode.window.showInformationMessage(`Deleted branch ${branchName}`);
        this._webview.postMessage({ command: "refreshLog" });
      } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to delete branch: ${e.message}`);
      }
    }
  }

  public async handleMergeBranch(branchName: string) {
    const rootPath = await this.getRootPath();
    if (!rootPath) return;

    const answer = await vscode.window.showWarningMessage(
      `Are you sure you want to merge '${branchName}' into current branch?`,
      { modal: true },
      "Merge"
    );
    if (answer === "Merge") {
      try {
        await GitService.merge(rootPath, branchName);
        vscode.window.showInformationMessage(`Merged branch ${branchName}`);
        this._webview.postMessage({ command: "refreshLog" });
      } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to merge branch: ${e.message}`);
      }
    }
  }
}
