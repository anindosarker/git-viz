import { registerPreset } from "./registry";
import type { ViewPreset } from "./types";

export const gitlensLikePreset: ViewPreset = {
  id: "gitlens-like",
  label: "GitLens",
  // gitlens-topo is delivered by Plan 4. Until then, fall back to rolling at
  // resolution time (see useGraph: getAlgorithm returns undefined for
  // unregistered ids, callers fall back to rollingAlgorithm).
  algorithmId: "gitlens-topo",
  rendererId: "hybrid-canvas-compact",
  defaultRefDisplay: "left-column",
  defaultRowHeight: 22,
  defaultColumns: [
    { id: "refs", visible: true, width: 200 },
    { id: "graph", visible: true, width: 200 },
    { id: "subject", visible: true, width: "flex" },
    { id: "author", visible: true, width: 180 },
    { id: "changes", visible: true, width: 180 },
    { id: "date", visible: true, width: 130 },
    { id: "hash", visible: true, width: 80 },
  ],
};

registerPreset(gitlensLikePreset);
