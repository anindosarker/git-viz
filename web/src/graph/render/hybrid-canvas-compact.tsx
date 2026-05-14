import { makeHybridCanvasRenderer } from "./hybrid-canvas-shared";
import { registerRenderer } from "./registry";

export const hybridCanvasCompact = makeHybridCanvasRenderer(
  "hybrid-canvas-compact",
  "Compact (GitLens)",
  {
    defaultRowHeight: 22,
    defaultLaneWidth: 16,
    nodeRadius: 7,
    showInitials: true,
    showAvatars: true,
    strokeWidth: 1.5,
  }
);

registerRenderer(hybridCanvasCompact);
