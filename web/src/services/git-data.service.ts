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
            hash: "mock1",
            parents: [],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date().toISOString(),
            message: "Initial mock commit",
          },
          {
            hash: "mock2",
            parents: ["mock1"],
            author: "Dev User",
            email: "dev@example.com",
            date: new Date().toISOString(),
            message: "Second mock commit",
          },
        ]);
      }, 500);
    });
  }
}

const gitDataService = new GitDataService();
export default gitDataService;
