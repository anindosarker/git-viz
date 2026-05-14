import { getGraphPalette, getHeadColor } from "../../colors";

export function getPalette(): string[] {
  return getGraphPalette();
}

export function getHeadBranchColor(): string {
  return getHeadColor();
}

export function paletteColor(index: number, palette = getPalette()): string {
  if (palette.length === 0) return "var(--vscode-descriptionForeground)";
  return palette[index % palette.length];
}
