import type { GitCommit } from "@/types/git";

export interface GraphNode extends GitCommit {
  x: number;
  y: number;
  color: string;
}

export interface GraphLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  type: "straight" | "curve" | "merge" | "fork";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  height: number;
  width: number;
}

const COLORS = [
  "#00b0ff", // Blue
  "#aa00ff", // Purple
  "#ff0000", // Red
  "#00ff00", // Green
  "#ffaa00", // Orange
  "#00aaaa", // Cyan
];

export function calculateGraph(
  commits: GitCommit[],
  rowHeight: number = 24,
  laneWidth: number = 20
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const commitIndices = new Map<string, number>();
  commits.forEach((c, i) => commitIndices.set(c.hash, i));

  // Pass 1: Assign Lanes and Coordinates
  // lanes[i] stores the commit hash that is currently "flowing" through lane i
  const lanes: (string | null)[] = [];
  const nodeLanes = new Map<string, number>(); // Store assigned lane for each commit

  commits.forEach((commit, index) => {
    // 1. Determine lane for current commit
    let laneIndex = lanes.findIndex((h) => h === commit.hash);

    if (laneIndex === -1) {
      // Not currently tracked in a lane (e.g. tip of a branch)
      // Find first free lane
      laneIndex = lanes.findIndex((h) => h === null);
      if (laneIndex === -1) laneIndex = lanes.length;
    }

    // Assign this commit to this lane
    nodeLanes.set(commit.hash, laneIndex);

    // Ensure lanes array is big enough
    if (laneIndex >= lanes.length) {
      for (let i = lanes.length; i <= laneIndex; i++) lanes[i] = null;
    }
    lanes[laneIndex] = commit.hash;

    const node: GraphNode = {
      ...commit,
      x: (laneIndex + 1) * laneWidth,
      y: index * rowHeight + rowHeight / 2,
      color: COLORS[laneIndex % COLORS.length],
    };
    nodes.push(node);

    // 2. Update lanes for parents (prepare for next commits)
    const parents = commit.parents;

    // The current commit is done with the lane, unless a parent takes it over.
    // By default, clear the lane.
    lanes[laneIndex] = null;

    if (parents.length > 0) {
      // First parent usually continues the lane (straight line)
      const firstParent = parents[0];

      // Check if first parent is already assigned a lane (merge case where parent was seen earlier? unlikely in topo sort)
      // In topo sort, parents appear AFTER children.

      // Assign first parent to current lane
      // But wait, what if that lane is already taken by someone else in the future?
      // (Not possible in this iteration step, we just cleared it)

      // Check if first parent is already tracked in another lane (merge into existing branch)
      const existingParentLane = lanes.findIndex((h) => h === firstParent);
      if (existingParentLane !== -1) {
        // Parent is already in a lane. We will merge INTO it later.
        // Current lane remains empty (ends here).
      } else {
        // Parent takes over current lane
        lanes[laneIndex] = firstParent;
      }

      // Secondary parents (forks/merges)
      for (let i = 1; i < parents.length; i++) {
        const parent = parents[i];
        const existingLane = lanes.findIndex((h) => h === parent);
        if (existingLane === -1) {
          // Find new free lane for this parent
          let newLane = lanes.findIndex((h) => h === null);
          if (newLane === -1) newLane = lanes.length;
          if (newLane >= lanes.length) lanes.push(null);
          lanes[newLane] = parent;
        }
      }
    }
  });

  // Pass 2: Generate Links
  nodes.forEach((node) => {
    node.parents.forEach((parentHash) => {
      const parentIndex = commitIndices.get(parentHash);
      if (parentIndex !== undefined) {
        const parentNode = nodes[parentIndex];

        // Simple straight line for now, can be improved to Bezier later
        links.push({
          x1: node.x,
          y1: node.y,
          x2: parentNode.x,
          y2: parentNode.y,
          color: node.color, // Link color matches child
          type: "straight", // Placeholder
        });
      }
    });
  });

  return {
    nodes,
    links,
    height: commits.length * rowHeight,
    width: lanes.length * laneWidth + 40,
  };
}
