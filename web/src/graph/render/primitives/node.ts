import { resolveColor } from "./palette";

export interface NodeDrawOptions {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  r: number;
  color: string;
  /** if true, draw a dashed circle (working-tree marker) */
  dashed?: boolean;
  /** if true, draw a thicker border (HEAD marker) */
  isHead?: boolean;
  initials?: string;
  fontPx?: number;
}

export function drawNodeCircle(opts: NodeDrawOptions): void {
  const { ctx, cx, cy, r, color, dashed, isHead, initials, fontPx } = opts;
  const fgOnNode = resolveColor("var(--vscode-editor-foreground)");
  ctx.save();
  if (dashed) {
    ctx.setLineDash([3, 2]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (isHead) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = fgOnNode;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (initials) {
      ctx.fillStyle = fgOnNode;
      ctx.font = `600 ${fontPx ?? Math.max(8, Math.floor(r * 0.9))}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, cx, cy + 0.5);
    }
  }
  ctx.restore();
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
