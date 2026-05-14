export interface LaneDrawCtx {
  ctx: CanvasRenderingContext2D;
  laneWidth: number;
  rowHeight: number;
  /** y offset of the row's top in canvas-pixel space */
  rowTop: number;
  strokeWidth: number;
}

function laneX(laneWidth: number, col: number): number {
  return laneWidth * (col + 1);
}

export function strokeVertical(
  d: LaneDrawCtx,
  col: number,
  yFrom: number,
  yTo: number,
  color: string
): void {
  const x = laneX(d.laneWidth, col);
  d.ctx.beginPath();
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = d.strokeWidth;
  d.ctx.moveTo(x, d.rowTop + yFrom);
  d.ctx.lineTo(x, d.rowTop + yTo);
  d.ctx.stroke();
}

/**
 * S-curve when a swimlane shifts from input column `from` to output column `to`.
 * Drawn across the full row height.
 */
export function strokeLaneShift(d: LaneDrawCtx, from: number, to: number, color: string): void {
  const W = d.laneWidth;
  const H = d.rowHeight;
  const H2 = H / 2;
  const xFrom = laneX(W, from);
  const xTo = laneX(W, to);
  const direction = to > from ? 1 : -1;
  const r = Math.min(5, H2);

  d.ctx.beginPath();
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = d.strokeWidth;
  d.ctx.moveTo(xFrom, d.rowTop);
  d.ctx.lineTo(xFrom, d.rowTop + 6);
  d.ctx.arcTo(xFrom, d.rowTop + H2, xFrom + direction * r, d.rowTop + H2, r);
  d.ctx.lineTo(xTo - direction * r, d.rowTop + H2);
  d.ctx.arcTo(xTo, d.rowTop + H2, xTo, d.rowTop + H2 + r, r);
  d.ctx.lineTo(xTo, d.rowTop + H);
  d.ctx.stroke();
}

/**
 * Merge curve from the node circle at `nodeCol` outward to parent column `parentCol`,
 * drawn from circle-center down to the row bottom.
 */
export function strokeMergeDown(
  d: LaneDrawCtx,
  nodeCol: number,
  parentCol: number,
  color: string
): void {
  const W = d.laneWidth;
  const H = d.rowHeight;
  const H2 = H / 2;
  const xNode = laneX(W, nodeCol);
  const xParent = laneX(W, parentCol);
  const arcR = Math.min(W, H2);

  d.ctx.beginPath();
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = d.strokeWidth;
  d.ctx.moveTo(xNode, d.rowTop + H2);
  if (xParent > xNode) {
    d.ctx.lineTo(xParent - arcR, d.rowTop + H2);
    d.ctx.arcTo(xParent, d.rowTop + H2, xParent, d.rowTop + H2 + arcR, arcR);
  } else {
    d.ctx.lineTo(xParent + arcR, d.rowTop + H2);
    d.ctx.arcTo(xParent, d.rowTop + H2, xParent, d.rowTop + H2 + arcR, arcR);
  }
  d.ctx.lineTo(xParent, d.rowTop + H);
  d.ctx.stroke();
}

/**
 * Merge curve incoming: a swimlane in the *input* row coming into the node circle.
 * Used when this commit appears in input lanes at a column != nodeCol.
 */
export function strokeMergeIn(
  d: LaneDrawCtx,
  fromCol: number,
  nodeCol: number,
  color: string
): void {
  const W = d.laneWidth;
  const H2 = d.rowHeight / 2;
  const xFrom = laneX(W, fromCol);
  const xNode = laneX(W, nodeCol);
  const arcR = Math.min(W, H2);

  d.ctx.beginPath();
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = d.strokeWidth;
  d.ctx.moveTo(xFrom, d.rowTop);
  if (xFrom > xNode) {
    d.ctx.lineTo(xFrom, d.rowTop + H2 - arcR);
    d.ctx.arcTo(xFrom, d.rowTop + H2, xFrom - arcR, d.rowTop + H2, arcR);
  } else {
    d.ctx.lineTo(xFrom, d.rowTop + H2 - arcR);
    d.ctx.arcTo(xFrom, d.rowTop + H2, xFrom + arcR, d.rowTop + H2, arcR);
  }
  d.ctx.lineTo(xNode, d.rowTop + H2);
  d.ctx.stroke();
}

export function nodeCenterX(laneWidth: number, col: number): number {
  return laneX(laneWidth, col);
}
