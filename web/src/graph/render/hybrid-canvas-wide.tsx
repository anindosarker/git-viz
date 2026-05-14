import { makeHybridCanvasRenderer } from "./hybrid-canvas-shared";
import { registerRenderer } from "./registry";

export const hybridCanvasWide = makeHybridCanvasRenderer("hybrid-canvas-wide", "Wide (Git Graph)", {
  defaultRowHeight: 28,
  defaultLaneWidth: 24,
  nodeRadius: 5,
  showInitials: false,
  strokeWidth: 2,
});

registerRenderer(hybridCanvasWide);
