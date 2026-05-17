/*
 * Fallbacks are the GitLens-leaning muted palette declared in index.css
 * (--vscode-scmGraph-foreground{1..6}). Kept here so the canvas renderer has a
 * sane palette before CSS variables resolve.
 */
const LANE_FALLBACKS = ["#3794ff", "#b180d7", "#89d185", "#d18616", "#f14c4c", "#b66dff"];
const HEAD_FALLBACK = "#b180d7";

let cachedLanes: string[] | null = null;
let cachedHead: string | null = null;

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function computeLanes(): string[] {
  return LANE_FALLBACKS.map((fb, i) => readVar(`--gitviz-graph-lane-${i + 1}`, fb));
}

function ensureLoaded(): void {
  if (cachedLanes && cachedHead) return;
  cachedLanes = computeLanes();
  cachedHead = readVar("--gitviz-graph-head", HEAD_FALLBACK);
}

export function invalidateGraphPaletteCache(): void {
  cachedLanes = null;
  cachedHead = null;
}

export function getGraphPalette(): string[] {
  ensureLoaded();
  return cachedLanes ?? LANE_FALLBACKS;
}

export function getHeadColor(): string {
  ensureLoaded();
  return cachedHead ?? HEAD_FALLBACK;
}

/**
 * Backwards-compat constant. Reading this once at module load returns
 * CSS-var-backed strings, but callers that need fresh values after a
 * theme change should call `getGraphPalette()` directly.
 */
export const GRAPH_PALETTE: string[] = [
  "var(--gitviz-graph-lane-1)",
  "var(--gitviz-graph-lane-2)",
  "var(--gitviz-graph-lane-3)",
  "var(--gitviz-graph-lane-4)",
  "var(--gitviz-graph-lane-5)",
  "var(--gitviz-graph-lane-6)",
];

export function colorForIndex(index: number): string {
  const palette = getGraphPalette();
  return palette[index % palette.length];
}
