const FALLBACKS = ["#c5963f", "#b85586", "#994f00", "#40b0a6", "#9b6bd0"];

const CSS_VAR_RE = /var\(\s*(--[^,)\s]+)(?:\s*,\s*([^)]+))?\)/;

/**
 * Resolve a CSS color string (possibly `var(--name, fallback)`) to a concrete
 * hex/rgb string that a canvas 2D context can paint.
 */
export function resolveColor(input: string, fallbackIndex = 0): string {
  if (!input) return FALLBACKS[fallbackIndex % FALLBACKS.length];
  const m = input.match(CSS_VAR_RE);
  if (!m) return input;
  if (typeof document !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
    if (v) return v;
  }
  if (m[2]) return m[2].trim();
  return FALLBACKS[fallbackIndex % FALLBACKS.length];
}
