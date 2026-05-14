import { registerPreset } from "./registry";
import type { ViewPreset } from "./types";

export const vscodeScmGraphLikePreset: ViewPreset = {
  id: "vscode-scm-graph-like",
  label: "VS Code SCM",
  algorithmId: "rolling",
  rendererId: "hybrid-canvas-medium",
  defaultRefDisplay: "right-column",
  defaultRowHeight: 24,
  defaultColumns: [
    { id: "graph", visible: true, width: 200 },
    { id: "subject", visible: true, width: "flex" },
    { id: "author", visible: true, width: 180 },
    { id: "hash", visible: true, width: 80 },
    { id: "date", visible: true, width: 130 },
    { id: "refs", visible: true, width: 220 },
  ],
};

registerPreset(vscodeScmGraphLikePreset);
