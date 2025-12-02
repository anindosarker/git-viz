import type { GitCommit } from "@/types/git";

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi(): VsCodeApi;
  }
}

class GitDataService {
  private vscode: VsCodeApi | null;

  constructor() {
    this.vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;
  }

  async getGitLog(): Promise<GitCommit[]> {
    if (!this.vscode) {
      // Try fetching from local server API (Standalone Mode)
      try {
        const response = await fetch("/api/log");
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (e) {
        console.warn(
          "Failed to fetch from /api/log, falling back to mock data",
          e
        );
      }

      return this.getMockData();
    }

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === "responseLog") {
          window.removeEventListener("message", handleMessage);
          resolve(message.data);
        }
      };

      window.addEventListener("message", handleMessage);
      this.vscode!.postMessage({ command: "requestLog" });

      // Optional: Add a timeout to reject the promise if no response is received
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        reject(new Error("Timeout waiting for git log"));
      }, 5000);
    });
  }

  private async getMockData(): Promise<GitCommit[]> {
    console.warn("VS Code API not available, using mock data");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            hash: "feat-tip",
            parents: ["master-head"],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date(Date.now() + 10000).toISOString(),
            refs: ["origin/feature"],
            message: "Feature Tip (Should be Lane 1)",
          },
          {
            hash: "toolbar-tip",
            parents: ["master-head"],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date(Date.now() + 5000).toISOString(),
            refs: ["origin/toolbar"],
            message: "Toolbar Tip (Should be Lane 2)",
          },
          {
            hash: "master-head",
            parents: ["master-root"],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date(Date.now()).toISOString(),
            refs: ["HEAD -> master"],
            message: "Master Head (Should be Lane 0)",
          },
          {
            hash: "master-root",
            parents: [],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date(Date.now() - 10000).toISOString(),
            refs: [],
            message: "Master Root (Should be Lane 0)",
          },
        ]);
      }, 500);
    });
  }
}

const gitDataService = new GitDataService();
export default gitDataService;
