import { makeHybridCanvasRenderer } from "./hybrid-canvas-shared";
import { registerRenderer } from "./registry";

export const hybridCanvasMedium = makeHybridCanvasRenderer(
  "hybrid-canvas-medium",
  "Medium (VS Code SCM)",
  {
    defaultRowHeight: 24,
    defaultLaneWidth: 20,
    nodeRadius: 5,
    showInitials: false,
    strokeWidth: 2,
  }
);

registerRenderer(hybridCanvasMedium);
