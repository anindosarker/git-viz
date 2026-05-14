function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildHighlightRegex(query: string, regex: boolean): RegExp | null {
  if (!query) return null;
  try {
    return regex ? new RegExp(`(${query})`, "gi") : new RegExp(`(${escapeRegex(query)})`, "gi");
  } catch {
    return null;
  }
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function splitHighlight(text: string, re: RegExp | null): HighlightSegment[] {
  if (!re || !text) return [{ text, match: false }];
  const parts = text.split(re);
  const segments: HighlightSegment[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") continue;
    segments.push({ text: parts[i], match: i % 2 === 1 });
  }
  return segments;
}
