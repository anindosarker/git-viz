import { registerPreset } from "./registry";
import type { ViewPreset } from "./types";

export const gitGraphLikePreset: ViewPreset = {
  id: "git-graph-like",
  label: "Git Graph",
  algorithmId: "rolling",
  rendererId: "hybrid-canvas-wide",
  defaultRefDisplay: "inline",
  defaultRowHeight: 28,
  defaultColumns: [
    { id: "graph", visible: true, width: 200 },
    { id: "subject", visible: true, width: "flex", refsInline: true },
    { id: "date", visible: true, width: 150 },
    { id: "author", visible: true, width: 200 },
    { id: "hash", visible: true, width: 80 },
  ],
};

registerPreset(gitGraphLikePreset);
