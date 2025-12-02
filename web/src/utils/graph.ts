import type { GitCommit } from "@/types/git";

export interface Swimlane {
  id: string; // Commit hash
  color: string;
}

export interface GraphRow {
  commit: GitCommit;
  inputSwimlanes: Swimlane[];
  outputSwimlanes: Swimlane[];
}

export interface GraphData {
  rows: GraphRow[];
  height: number;
  width: number;
}

const COLORS = [
  "#0098fa", // Blue
  "#9a00fa", // Purple
  "#00fa9a", // Spring Green
  "#fa9a00", // Orange
  "#fa0098", // Pink
  "#00fafa", // Cyan
  "#fafa00", // Yellow
];

export function calculateGraph(
  commits: GitCommit[],
  rowHeight: number = 24,
  laneWidth: number = 20
): GraphData {
  const rows: GraphRow[] = [];
  let colorIndex = 0;

  // Map to track which commit IDs have which colors
  const colorMap = new Map<string, string>();

  // Helper to get next color
  const getNextColor = () => {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
  };

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Get input swimlanes from previous commit's output
    const inputSwimlanes: Swimlane[] =
      i === 0 ? [] : [...rows[i - 1].outputSwimlanes];

    const outputSwimlanes: Swimlane[] = [];

    let firstParentAdded = false;

    // Process first parent: replace current commit with its first parent
    if (commit.parents.length > 0) {
      for (const node of inputSwimlanes) {
        if (node.id === commit.hash) {
          if (!firstParentAdded) {
            // Keep the same color - the parent continues this branch
            outputSwimlanes.push({
              id: commit.parents[0],
              color: node.color, // Preserve the existing color!
            });
            firstParentAdded = true;
          }
          continue; // Don't copy this node (it's consumed)
        }

        // Pass through other lanes
        outputSwimlanes.push({ ...node });
      }

      // If commit wasn't in input swimlanes, it's a new branch - assign color
      if (!firstParentAdded) {
        let color = colorMap.get(commit.parents[0]);
        if (!color) {
          color = getNextColor();
          colorMap.set(commit.parents[0], color);
        }

        outputSwimlanes.push({
          id: commit.parents[0],
          color: color,
        });
        firstParentAdded = true;
      }
    }

    // Add additional parents (for merge commits)
    for (let p = firstParentAdded ? 1 : 0; p < commit.parents.length; p++) {
      const parentId = commit.parents[p];

      let color = colorMap.get(parentId);
      if (!color) {
        color = getNextColor();
        colorMap.set(parentId, color);
      }

      outputSwimlanes.push({
        id: parentId,
        color: color,
      });
    }

    // Determine commit color
    // If commit was in input, use that color
    // If not, use the color we assigned to its first parent
    const inputIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);
    const commitColor =
      inputIndex !== -1
        ? inputSwimlanes[inputIndex].color
        : (commit.parents.length > 0
            ? colorMap.get(commit.parents[0])
            : getNextColor()) || getNextColor();

    rows.push({
      commit: { ...commit, color: commitColor },
      inputSwimlanes,
      outputSwimlanes,
    });
  }

  return {
    rows,
    height: commits.length * rowHeight,
    width:
      Math.max(
        ...rows.map((r) =>
          Math.max(r.inputSwimlanes.length, r.outputSwimlanes.length)
        )
      ) *
        laneWidth +
      40,
  };
}
