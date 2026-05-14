const LANE_FALLBACKS = ["#ffb000", "#dc267f", "#994f00", "#40b0a6", "#b66dff"];
const HEAD_FALLBACK = "#3794ff";

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
  "var(--gitviz-graph-lane-1, #ffb000)",
  "var(--gitviz-graph-lane-2, #dc267f)",
  "var(--gitviz-graph-lane-3, #994f00)",
  "var(--gitviz-graph-lane-4, #40b0a6)",
  "var(--gitviz-graph-lane-5, #b66dff)",
];

export function colorForIndex(index: number): string {
  const palette = getGraphPalette();
  return palette[index % palette.length];
}
