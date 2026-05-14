import type { WebviewApi } from "vscode-webview";

declare global {
  interface Window {
    acquireVsCodeApi?: () => WebviewApi<unknown>;
  }
}

let cached: WebviewApi<unknown> | null | undefined;

/**
 * `acquireVsCodeApi` can only be invoked once per webview. Share the result
 * across modules (transport, persistence, etc.) through this singleton.
 */
export function getVsCodeApi(): WebviewApi<unknown> | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || typeof window.acquireVsCodeApi !== "function") {
    cached = null;
    return cached;
  }
  try {
    cached = window.acquireVsCodeApi();
  } catch {
    cached = null;
  }
  return cached;
}
