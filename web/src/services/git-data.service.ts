import type { GitCommit } from "@/types/git";
import type { WebviewApi } from "vscode-webview";

class GitDataService {
  private vscode: WebviewApi<unknown> | undefined;

  constructor() {
    if (typeof window !== "undefined" && window.acquireVsCodeApi) {
      this.vscode = window.acquireVsCodeApi();
    }
  }

  getLog(): Promise<GitCommit[]> {
    return new Promise((resolve) => {
      if (!this.vscode) {
        // Fetch from local server for development
        fetch("http://localhost:3000/api/log")
          .then((res) => res.json())
          .then((data) => resolve(data))
          .catch(() => resolve([]));
        return;
      }

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === "responseLog") {
          window.removeEventListener("message", handler);
          resolve(message.data);
        }
      };

      window.addEventListener("message", handler);
      this.vscode.postMessage({ command: "requestLog" });
    });
  }

  getRepoInfo(): Promise<{ repo: string; branch: string }> {
    return new Promise((resolve) => {
      if (!this.vscode) {
        fetch("http://localhost:3000/api/repo-info")
          .then((res) => res.json())
          .then((data) => resolve(data))
          .catch(() => resolve({ repo: "dev", branch: "main" }));
        return;
      }

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === "responseRepoInfo") {
          window.removeEventListener("message", handler);
          resolve(message.data);
        }
      };

      window.addEventListener("message", handler);
      this.vscode.postMessage({ command: "requestRepoInfo" });
    });
  }

  copyCommitHash(hash: string) {
    if (this.vscode) {
      this.vscode.postMessage({ command: "copyCommitHash", data: hash });
    } else {
      navigator.clipboard.writeText(hash);
    }
  }

  checkoutCommit(hash: string) {
    if (this.vscode) {
      this.vscode.postMessage({ command: "checkoutCommit", data: hash });
    } else {
      const div = document.createElement("div");
      div.id = "verify-feedback";
      div.style.cssText =
        "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100;background:green;color:white;padding:10px;border-radius:4px;";
      div.textContent = `Checkout commit: ${hash}`;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }
  }

  checkoutBranch(branch: string) {
    if (this.vscode) {
      this.vscode.postMessage({ command: "checkoutBranch", data: branch });
    } else {
      console.log(`Checkout branch: ${branch}`); // Keep log for debugging
      const div = document.createElement("div");
      div.id = "verify-feedback";
      div.style.cssText =
        "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100;background:green;color:white;padding:10px;border-radius:4px;";
      div.textContent = `Checkout branch: ${branch}`;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }
  }

  deleteBranch(branch: string) {
    if (this.vscode) {
      this.vscode.postMessage({ command: "deleteBranch", data: branch });
    } else {
      const div = document.createElement("div");
      div.id = "verify-feedback";
      div.style.cssText =
        "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100;background:red;color:white;padding:10px;border-radius:4px;";
      div.textContent = `Delete branch: ${branch}`;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }
  }

  mergeBranch(branch: string) {
    if (this.vscode) {
      this.vscode.postMessage({ command: "mergeBranch", data: branch });
    } else {
      const div = document.createElement("div");
      div.id = "verify-feedback";
      div.style.cssText =
        "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100;background:blue;color:white;padding:10px;border-radius:4px;";
      div.textContent = `Merge branch: ${branch}`;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }
  }
}

const gitDataService = new GitDataService();
export default gitDataService;
