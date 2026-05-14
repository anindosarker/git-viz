import type { WebviewApi } from "vscode-webview";
import { getVsCodeApi } from "./vscodeApi";

export interface TransportEvent {
  name: string;
  payload?: unknown;
}

export type EventListener = (event: TransportEvent) => void;

export interface Transport {
  request<T>(command: string, payload?: unknown): Promise<T>;
  /**
   * Subscribe to backend-pushed events (e.g. "git:state-changed"). Returns an
   * unsubscribe function.
   */
  on(listener: EventListener): () => void;
  /** Returns the active repo id (path), if any, so the store can key per-repo state. */
  getRepoId?(): string | undefined;
  /** Switch the active repo for subsequent requests. */
  setRepoId?(id: string): void;
}

interface WebviewResponse {
  id?: string;
  command: string;
  data?: unknown;
  error?: string;
}

interface WebviewEvent {
  kind: "event";
  name: string;
  payload?: unknown;
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
  private readonly listeners = new Set<EventListener>();
  private repoId: string | undefined;

  constructor(vscode: WebviewApi<unknown>) {
    this.vscode = vscode;
    window.addEventListener("message", this.onMessage);
  }

  private onMessage = (event: MessageEvent<WebviewResponse | WebviewEvent>) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    if ((msg as WebviewEvent).kind === "event") {
      const evt = msg as WebviewEvent;
      for (const l of this.listeners) {
        try {
          l({ name: evt.name, payload: evt.payload });
        } catch {
          /* swallow */
        }
      }
      return;
    }
    const { id, command, data, error } = msg as WebviewResponse;
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
      const merged =
        this.repoId !== undefined
          ? { repoId: this.repoId, ...(payload as Record<string, unknown> | undefined) }
          : payload;
      this.vscode.postMessage({ id, command, payload: merged });
    });
  }

  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRepoId(): string | undefined {
    return this.repoId;
  }

  setRepoId(id: string): void {
    this.repoId = id;
  }
}

const TOKEN_STORAGE_KEY = "git-viz.token";
const REPO_ID_STORAGE_KEY = "git-viz.repoId";

/** Reads the auth token from URL hash (#token=…) and stashes it in sessionStorage. */
function pickupTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const token = params.get("token");
  if (token) {
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // ignore quota errors
    }
    // Strip the token from the URL so it doesn't leak via history / share.
    params.delete("token");
    const rest = params.toString();
    const newHash = rest ? `#${rest}` : "";
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search + newHash
      );
    } catch {
      // ignore
    }
    return token;
  }
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export class StandaloneTransport implements Transport {
  private readonly base: string;
  private readonly listeners = new Set<EventListener>();
  private readonly token: string | null;
  private repoId: string | undefined;

  constructor(base = "") {
    this.base = base;
    this.token = pickupTokenFromHash();
    try {
      this.repoId = sessionStorage.getItem(REPO_ID_STORAGE_KEY) ?? undefined;
    } catch {
      // ignore
    }
  }

  getRepoId(): string | undefined {
    return this.repoId;
  }

  setRepoId(id: string): void {
    this.repoId = id;
    try {
      sessionStorage.setItem(REPO_ID_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  /** Returns the EventSource URL for SSE — clients append `?repoId=…`. */
  eventsUrl(repoId?: string): string {
    const params = new URLSearchParams();
    if (repoId ?? this.repoId) params.set("repoId", repoId ?? this.repoId!);
    if (this.token) params.set("token", this.token);
    const qs = params.toString();
    return `${this.base}/api/events${qs ? `?${qs}` : ""}`;
  }

  on(listener: EventListener): () => void {
    // Standalone mode in Plan 5d has no push channel. Plan 5e adds SSE; for
    // now we still register so callers don't have to special-case, and we
    // synthesize the event after action requests.
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: TransportEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        /* swallow */
      }
    }
  }

  async request<T>(command: string, payload?: unknown): Promise<T> {
    const route = StandaloneTransport.route(command, payload);
    const url = new URL(this.base + route.path, window.location.origin);
    if (this.repoId !== undefined && !url.searchParams.has("repoId")) {
      url.searchParams.set("repoId", this.repoId);
    }
    const init: RequestInit = { method: route.method };
    const headers: Record<string, string> = {};
    if (route.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(route.body);
    }
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (Object.keys(headers).length > 0) init.headers = headers;
    const res = await fetch(url.toString(), init);
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
    let result: T;
    if (route.responseType === "text") {
      result = (await res.text()) as unknown as T;
    } else {
      result = (await res.json()) as T;
    }
    if (command.startsWith("actions:")) {
      this.emit({
        name: "git:state-changed",
        payload: { kinds: ["refs", "commits", "head"] },
      });
    }
    return result;
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
        const params: string[] = [];
        if (typeof p.limit === "number") params.push(`limit=${p.limit}`);
        if (p.order === "topo" || p.order === "date") params.push(`order=${p.order}`);
        const query = params.length ? `?${params.join("&")}` : "";
        return { method: "GET", path: `/api/bootstrap${query}` };
      }
      case "repo:getInfo":
        return { method: "GET", path: "/api/repo-info" };
      case "repos:list":
        return { method: "GET", path: "/api/repos" };
      case "submodules:list":
        return { method: "GET", path: "/api/submodules" };
      case "worktrees:list":
        return { method: "GET", path: "/api/worktrees" };
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
        if (command.startsWith("actions:")) {
          // "actions:branch:create" -> "/api/actions/branch/create"
          const subpath = command.slice("actions:".length).replace(/:/g, "/");
          return { method: "POST", path: `/api/actions/${subpath}`, body: p };
        }
        throw new Error(`StandaloneTransport: no REST mapping for command "${command}"`);
    }
  }
}

let sharedTransport: Transport | undefined;

export function makeTransport(): Transport {
  if (sharedTransport) return sharedTransport;
  const api = getVsCodeApi();
  sharedTransport = api ? new VSCodeTransport(api) : new StandaloneTransport();
  return sharedTransport;
}
