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
}

/** Outer shape: global activeRepoId + a slice per repo. */
export interface PersistedRoot {
  /** Active repo id (path). */
  activeRepoId?: string;
  /** Per-repo state, keyed by repo id. */
  perRepo?: Record<string, PersistedState>;
}

export interface PersistAdapter {
  get(): PersistedRoot;
  set(state: PersistedRoot): void;
}

const LOCAL_STORAGE_KEY = "git-viz.webview.state";

export function makePersistAdapter(): PersistAdapter {
  const api = getVsCodeApi();
  if (api) {
    return {
      get(): PersistedRoot {
        return normalize((api.getState() as PersistedRoot | undefined) ?? {});
      },
      set(state: PersistedRoot): void {
        api.setState(state);
      },
    };
  }
  return {
    get(): PersistedRoot {
      if (typeof localStorage === "undefined") return {};
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return normalize(raw ? (JSON.parse(raw) as PersistedRoot) : {});
      } catch {
        return {};
      }
    },
    set(state: PersistedRoot): void {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // quota exceeded etc.
      }
    },
  };
}

/**
 * Migrates legacy flat persisted state (no per-repo keying) into the new
 * shape under an empty repo id. Safe to call repeatedly.
 */
function normalize(raw: PersistedRoot | (PersistedState & { perRepo?: never })): PersistedRoot {
  if (!raw || typeof raw !== "object") return {};
  if (raw.perRepo) return raw as PersistedRoot;
  // Treat any top-level keys we recognize as a legacy single-repo slice.
  const legacyKeys: (keyof PersistedState)[] = [
    "selectedHash",
    "scrollY",
    "presetId",
    "refDisplay",
    "rowHeight",
    "columns",
  ];
  const legacy: PersistedState = {};
  let hasLegacy = false;
  for (const k of legacyKeys) {
    const v = (raw as Record<string, unknown>)[k];
    if (v !== undefined) {
      (legacy as Record<string, unknown>)[k] = v;
      hasLegacy = true;
    }
  }
  if (!hasLegacy) return {};
  return { perRepo: { "": legacy } };
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
