/**
 * Persistence adapter used by the Zustand store.
 *
 * In a VS Code webview we have `acquireVsCodeApi().getState/setState`,
 * which survives webview reloads. In standalone mode we fall back to
 * `localStorage`. Both expose the same `get`/`set` shape, so the store
 * doesn't care which host it's running in.
 */

import { getVsCodeApi } from "../services/vscodeApi";

export interface PersistedState {
  selectedHash?: string;
  scrollY?: number;
  presetId?: string;
  refDisplay?: string;
  rowHeight?: number;
  columns?: string[];
  query?: string;
  queryRegex?: boolean;
  author?: string | null;
  since?: string | null;
  until?: string | null;
  paths?: string[];
  refScope?: string[];
}

export interface PersistAdapter {
  get(): PersistedState;
  set(state: PersistedState): void;
}

const LOCAL_STORAGE_KEY = "git-viz.webview.state";

export function makePersistAdapter(): PersistAdapter {
  const api = getVsCodeApi();
  if (api) {
    return {
      get(): PersistedState {
        return (api.getState() as PersistedState) ?? {};
      },
      set(state: PersistedState): void {
        api.setState(state);
      },
    };
  }
  return {
    get(): PersistedState {
      if (typeof localStorage === "undefined") return {};
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as PersistedState) : {};
      } catch {
        return {};
      }
    },
    set(state: PersistedState): void {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // quota exceeded etc.
      }
    },
  };
}

let cachedAdapter: PersistAdapter | null = null;
export function getPersistAdapter(): PersistAdapter {
  if (!cachedAdapter) cachedAdapter = makePersistAdapter();
  return cachedAdapter;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  }) as T;
}
