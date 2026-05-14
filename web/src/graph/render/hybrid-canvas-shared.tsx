import React, { useEffect, useRef } from "react";
import type { GraphRow } from "../types";
import { getAvatarImage, subscribeAvatarLoads } from "../avatars";
import { drawNodeCircle, getInitials } from "./primitives/node";
import {
  nodeCenterX,
  strokeLaneShift,
  strokeMergeDown,
  strokeMergeIn,
  strokeVertical,
} from "./primitives/lane";
import { resolveColor } from "./primitives/palette";
import type { GraphRendererProps } from "./types";

export interface HybridCanvasConfig {
  defaultRowHeight: number;
  defaultLaneWidth: number;
  /** Pixel radius of node circle */
  nodeRadius: number;
  /** Whether to render author initials inside the node */
  showInitials: boolean;
  /** Whether to render the author's avatar (gravatar) inside the node */
  showAvatars?: boolean;
  strokeWidth: number;
}

interface DrawingPlan {
  passes: { fromCol: number; toCol: number; color: string }[];
  mergeIns: { fromCol: number; nodeCol: number; color: string }[];
  mergeDowns: { nodeCol: number; parentCol: number; color: string }[];
  topToCircle?: { col: number; color: string };
  fromCircleDown?: { col: number; color: string };
}

function planRow(row: GraphRow): DrawingPlan {
  const { commit, inputSwimlanes, outputSwimlanes, nodeColumn } = row;
  const plan: DrawingPlan = { passes: [], mergeIns: [], mergeDowns: [] };

  let outIdx = 0;
  for (let i = 0; i < inputSwimlanes.length; i++) {
    const input = inputSwimlanes[i];
    if (input.id === commit.hash) {
      if (i !== nodeColumn) {
        plan.mergeIns.push({ fromCol: i, nodeCol: nodeColumn, color: input.color });
      } else {
        // This input position is the node — its first matching output is the
        // first-parent lane that descends below the circle.
        outIdx++;
      }
      continue;
    }
    if (outIdx < outputSwimlanes.length && outputSwimlanes[outIdx].id === input.id) {
      if (i === outIdx) {
        plan.passes.push({ fromCol: i, toCol: i, color: input.color });
      } else {
        plan.passes.push({ fromCol: i, toCol: outIdx, color: input.color });
      }
      outIdx++;
    }
  }

  // Extra parents (additional merge edges) — second+ parents.
  for (let p = 1; p < commit.parents.length; p++) {
    const parentId = commit.parents[p];
    let parentOutCol = -1;
    for (let i = outputSwimlanes.length - 1; i >= 0; i--) {
      if (outputSwimlanes[i].id === parentId) {
        parentOutCol = i;
        break;
      }
    }
    if (parentOutCol === -1) continue;
    plan.mergeDowns.push({
      nodeCol: nodeColumn,
      parentCol: parentOutCol,
      color: outputSwimlanes[parentOutCol].color,
    });
  }

  // Top half: incoming swimlane to the circle (if this commit appeared in input lanes)
  const inputIdx = inputSwimlanes.findIndex((s) => s.id === commit.hash);
  if (inputIdx !== -1) {
    plan.topToCircle = { col: nodeColumn, color: inputSwimlanes[inputIdx].color };
  }

  // Bottom half: from circle down to first-parent lane
  if (commit.parents.length > 0) {
    const firstParent = commit.parents[0];
    let firstParentCol = nodeColumn;
    for (let i = 0; i < outputSwimlanes.length; i++) {
      if (outputSwimlanes[i].id === firstParent) {
        firstParentCol = i;
        break;
      }
    }
    plan.fromCircleDown = {
      col: firstParentCol,
      color:
        outputSwimlanes[firstParentCol]?.color ??
        plan.topToCircle?.color ??
        inputSwimlanes[0]?.color ??
        "var(--vscode-descriptionForeground)",
    };
  }

  return plan;
}

function circleColorFor(row: GraphRow): string {
  const { inputSwimlanes, outputSwimlanes, nodeColumn, commit } = row;
  if (nodeColumn < outputSwimlanes.length) return outputSwimlanes[nodeColumn].color;
  if (nodeColumn < inputSwimlanes.length) return inputSwimlanes[nodeColumn].color;
  return commit.color ?? "var(--vscode-descriptionForeground)";
}

function laneCountForRow(row: GraphRow): number {
  return Math.max(row.inputSwimlanes.length, row.outputSwimlanes.length, row.nodeColumn + 1);
}

function colorResolverCache(): (c: string, i: number) => string {
  const cache = new Map<string, string>();
  return (c, i) => {
    let v = cache.get(c);
    if (v === undefined) {
      v = resolveColor(c, i);
      cache.set(c, v);
    }
    return v;
  };
}

interface HybridCanvasInternalProps extends GraphRendererProps {
  config: HybridCanvasConfig;
}

export const HybridCanvas: React.FC<HybridCanvasInternalProps> = ({
  rows,
  rowHeight,
  laneWidth,
  visibleRange,
  onSelect,
  onHover,
  config,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [, forceDraw] = React.useReducer((x: number) => x + 1, 0);

  // Re-paint when any avatar finishes loading.
  useEffect(() => {
    if (!config.showAvatars) return;
    return subscribeAvatarLoads(() => forceDraw());
  }, [config.showAvatars]);

  const maxLanes = React.useMemo(() => {
    let m = 0;
    for (const r of rows) {
      const c = laneCountForRow(r);
      if (c > m) m = c;
    }
    return Math.max(1, m);
  }, [rows]);

  const width = maxLanes * laneWidth + laneWidth;
  const totalHeight = rows.length * rowHeight;

  const start = visibleRange?.start ?? 0;
  const end = visibleRange?.end ?? rows.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssW = width;
      const cssH = totalHeight;
      if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
      }
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const resolve = colorResolverCache();
      const lo = Math.max(0, start - 2);
      const hi = Math.min(rows.length, end + 2);

      for (let i = lo; i < hi; i++) {
        const row = rows[i];
        const rowTop = i * rowHeight;
        const d = {
          ctx,
          laneWidth,
          rowHeight,
          rowTop,
          strokeWidth: config.strokeWidth,
        };
        const plan = planRow(row);
        for (const p of plan.passes) {
          if (p.fromCol === p.toCol) {
            strokeVertical(d, p.fromCol, 0, rowHeight, resolve(p.color, p.fromCol));
          } else {
            strokeLaneShift(d, p.fromCol, p.toCol, resolve(p.color, p.fromCol));
          }
        }
        for (const m of plan.mergeIns) {
          strokeMergeIn(d, m.fromCol, m.nodeCol, resolve(m.color, m.fromCol));
        }
        for (const m of plan.mergeDowns) {
          strokeMergeDown(d, m.nodeCol, m.parentCol, resolve(m.color, m.parentCol));
        }
        if (plan.topToCircle) {
          strokeVertical(
            d,
            plan.topToCircle.col,
            0,
            rowHeight / 2,
            resolve(plan.topToCircle.color, plan.topToCircle.col)
          );
        }
        if (plan.fromCircleDown) {
          strokeVertical(
            d,
            plan.fromCircleDown.col,
            rowHeight / 2,
            rowHeight,
            resolve(plan.fromCircleDown.color, plan.fromCircleDown.col)
          );
        }

        const cx = nodeCenterX(laneWidth, row.nodeColumn);
        const cy = rowTop + rowHeight / 2;
        let avatarImg: HTMLImageElement | undefined;
        if (config.showAvatars && row.kind === "node" && row.commit.authorEmail) {
          const entry = getAvatarImage(row.commit.authorEmail, row.commit.authorAvatar);
          if (entry.loaded && !entry.failed) avatarImg = entry.img;
        }
        drawNodeCircle({
          ctx,
          cx,
          cy,
          r: config.nodeRadius,
          color: resolve(circleColorFor(row), row.nodeColumn),
          dashed: row.kind === "working-tree",
          isHead: row.kind === "HEAD",
          initials: config.showInitials && !avatarImg ? getInitials(row.commit.author) : undefined,
          avatar: avatarImg,
        });
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [rows, rowHeight, laneWidth, width, totalHeight, start, end, config]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    const cx = nodeCenterX(laneWidth, row.nodeColumn);
    const dx = Math.abs(x - cx);
    if (dx <= config.nodeRadius + 2) {
      onSelect(row.commit.hash);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex < 0 || rowIndex >= rows.length) {
      onHover(null);
      return;
    }
    onHover(rows[rowIndex].commit.hash);
  };

  const handleMouseLeave = () => {
    if (onHover) onHover(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: "block" }}
    />
  );
};

export function makeHybridCanvasRenderer(
  id: string,
  label: string,
  config: HybridCanvasConfig
): {
  id: string;
  label: string;
  defaultRowHeight: number;
  defaultLaneWidth: number;
  Component: React.FC<GraphRendererProps>;
} {
  const Component: React.FC<GraphRendererProps> = (props) => (
    <HybridCanvas {...props} config={config} />
  );
  Component.displayName = `HybridCanvas(${id})`;
  return {
    id,
    label,
    defaultRowHeight: config.defaultRowHeight,
    defaultLaneWidth: config.defaultLaneWidth,
    Component,
  };
}
