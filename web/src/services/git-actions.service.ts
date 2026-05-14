import type { WebviewApi } from "vscode-webview";

function getVscode(): WebviewApi<unknown> | undefined {
  if (typeof window !== "undefined" && typeof window.acquireVsCodeApi === "function") {
    return window.acquireVsCodeApi();
  }
  return undefined;
}

function flashFeedback(text: string, color: string): void {
  if (typeof document === "undefined") return;
  const div = document.createElement("div");
  div.id = "verify-feedback";
  div.style.cssText =
    "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100;" +
    `background:${color};color:white;padding:10px;border-radius:4px;`;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

class GitActionsService {
  private readonly vscode = getVscode();

  copyCommitHash(hash: string): void {
    if (this.vscode) {
      this.vscode.postMessage({ command: "copyCommitHash", data: hash });
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(hash);
    }
  }

  checkoutCommit(hash: string): void {
    if (this.vscode) {
      this.vscode.postMessage({ command: "checkoutCommit", data: hash });
    } else {
      flashFeedback(`Checkout commit: ${hash}`, "green");
    }
  }

  checkoutBranch(branch: string): void {
    if (this.vscode) {
      this.vscode.postMessage({ command: "checkoutBranch", data: branch });
    } else {
      flashFeedback(`Checkout branch: ${branch}`, "green");
    }
  }

  deleteBranch(branch: string): void {
    if (this.vscode) {
      this.vscode.postMessage({ command: "deleteBranch", data: branch });
    } else {
      flashFeedback(`Delete branch: ${branch}`, "red");
    }
  }

  mergeBranch(branch: string): void {
    if (this.vscode) {
      this.vscode.postMessage({ command: "mergeBranch", data: branch });
    } else {
      flashFeedback(`Merge branch: ${branch}`, "blue");
    }
  }
}

export const gitActions = new GitActionsService();
