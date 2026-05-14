import { registerAlgorithm } from "../registry";
import type { GraphAlgorithm } from "../types";
import { compute } from "./compute";

export const gitlensTopoAlgorithm: GraphAlgorithm = {
  id: "gitlens-topo",
  label: "GitLens-like",
  description:
    "Topology-aware lane allocator. Branch tips reserve lanes; HEAD pinned to lane 0; lanes reuse on death.",
  compute,
};

registerAlgorithm(gitlensTopoAlgorithm);
