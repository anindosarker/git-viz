import type { GitChangeKind } from "@git-viz/shared";
import { StandaloneTransport, type Transport } from "./transport";

export interface GitStateChange {
  repoId: string;
  kinds: GitChangeKind[];
}

export type GitStateListener = (change: GitStateChange) => void;

/**
 * Subscribes to git state-changed events from the active transport. For the
 * standalone backend this opens an EventSource against `/api/events`. For the
 * VS Code webview it listens for `git:state-changed` postMessage events.
 */
export class GitEventSubscriber {
  private listeners = new Set<GitStateListener>();
  private eventSource: EventSource | undefined;
  private reconnectTimer: number | undefined;
  private currentRepoId: string | undefined;
  private windowListener: ((event: MessageEvent) => void) | undefined;
  private readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  subscribe(repoId: string | undefined, listener: GitStateListener): () => void {
    this.listeners.add(listener);
    this.ensureChannel(repoId);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.close();
    };
  }

  setRepoId(repoId: string): void {
    if (repoId === this.currentRepoId) return;
    this.currentRepoId = repoId;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      this.openSse(repoId);
    }
  }

  private ensureChannel(repoId: string | undefined): void {
    this.currentRepoId = repoId;
    if (this.transport instanceof StandaloneTransport) {
      if (!this.eventSource) this.openSse(repoId);
    } else if (!this.windowListener) {
      this.windowListener = (event: MessageEvent) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;
        if (msg.kind === "event" && msg.name === "git:state-changed" && msg.payload) {
          this.emit(msg.payload);
        }
      };
      window.addEventListener("message", this.windowListener);
    }
  }

  private openSse(repoId: string | undefined): void {
    if (!(this.transport instanceof StandaloneTransport)) return;
    try {
      const url = this.transport.eventsUrl(repoId);
      const es = new EventSource(url);
      this.eventSource = es;
      es.addEventListener("git:state-changed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data);
        } catch {
          // ignore malformed payload
        }
      });
      es.addEventListener("error", () => {
        // EventSource will auto-reconnect, but if the server went away we
        // back off manually to avoid a tight loop in dev.
        if (es.readyState === EventSource.CLOSED) {
          this.eventSource = undefined;
          this.scheduleReconnect();
        }
      });
    } catch (err) {
      console.warn("[GitEventSubscriber] failed to open SSE:", err);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.listeners.size > 0) this.openSse(this.currentRepoId);
    }, 2_000);
  }

  private emit(change: GitStateChange): void {
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (err) {
        console.warn("[GitEventSubscriber] listener threw:", err);
      }
    }
  }

  private close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    if (this.windowListener) {
      window.removeEventListener("message", this.windowListener);
      this.windowListener = undefined;
    }
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
