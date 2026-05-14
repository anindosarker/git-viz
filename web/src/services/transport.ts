import type { WebviewApi } from "vscode-webview";
import { getVsCodeApi } from "./vscodeApi";

export interface Transport {
  request<T>(command: string, payload?: unknown): Promise<T>;
}

interface WebviewResponse {
  id?: string;
  command: string;
  data?: unknown;
  error?: string;
}

type Pending = {
  resolve(value: unknown): void;
  reject(reason: unknown): void;
};

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class VSCodeTransport implements Transport {
  private readonly vscode: WebviewApi<unknown>;
  private readonly pending = new Map<string, Pending>();

  constructor(vscode: WebviewApi<unknown>) {
    this.vscode = vscode;
    window.addEventListener("message", this.onMessage);
  }

  private onMessage = (event: MessageEvent<WebviewResponse>) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    const { id, command, data, error } = msg;
    if (!id || !command || !command.endsWith(":response")) return;
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id);
    if (error) entry.reject(new Error(error));
    else entry.resolve(data);
  };

  request<T>(command: string, payload?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = newRequestId();
      this.pending.set(id, { resolve: resolve as Pending["resolve"], reject });
      this.vscode.postMessage({ id, command, payload });
    });
  }
}

export class StandaloneTransport implements Transport {
  private readonly base: string;

  constructor(base = "") {
    this.base = base;
  }

  async request<T>(command: string, payload?: unknown): Promise<T> {
    const route = StandaloneTransport.route(command, payload);
    const url = this.base + route.path;
    const init: RequestInit = { method: route.method };
    if (route.body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(route.body);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const errBody = await res.json();
        if (errBody?.error) message = String(errBody.error);
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    if (route.responseType === "text") {
      return (await res.text()) as unknown as T;
    }
    return (await res.json()) as T;
  }

  private static route(
    command: string,
    payload: unknown
  ): {
    method: "GET" | "POST";
    path: string;
    body?: unknown;
    responseType?: "json" | "text";
  } {
    const p = (payload ?? {}) as Record<string, unknown>;
    switch (command) {
      case "bootstrap": {
        const limit = typeof p.limit === "number" ? `?limit=${p.limit}` : "";
        return { method: "GET", path: `/api/bootstrap${limit}` };
      }
      case "repo:getInfo":
        return { method: "GET", path: "/api/repo-info" };
      case "commits:getPage":
        return { method: "POST", path: "/api/commits/page", body: p };
      case "commits:getDetails":
        return { method: "GET", path: `/api/commits/details/${p.hash}` };
      case "commits:getFileChanges":
        return { method: "GET", path: `/api/commits/file-changes/${p.hash}` };
      case "commits:getFileDiff":
        return {
          method: "GET",
          path: `/api/commits/file-diff/${p.hash}?path=${encodeURIComponent(String(p.path))}`,
        };
      case "commits:getPatch":
        return { method: "GET", path: `/api/commits/patch/${p.hash}`, responseType: "text" };
      case "commits:getCommit":
        return { method: "GET", path: `/api/commits/${p.hash}` };
      case "refs:getAll": {
        const include = p.includeRemote === false ? "?includeRemote=false" : "";
        return { method: "GET", path: `/api/refs${include}` };
      }
      case "remotes:list":
        return { method: "GET", path: "/api/remotes" };
      default:
        throw new Error(`StandaloneTransport: no REST mapping for command "${command}"`);
    }
  }
}

export function makeTransport(): Transport {
  const api = getVsCodeApi();
  if (api) {
    return new VSCodeTransport(api);
  }
  return new StandaloneTransport();
}
