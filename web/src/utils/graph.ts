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
  let currentSwimlanes: Swimlane[] = [];
  let colorIndex = 0;

  // Helper to get next color
  const getNextColor = () => {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
  };

  // 0. Identify Main Line (HEAD) to prioritize colors or placement (optional but good)
  // For now, we'll stick to the standard topo-sort processing which usually handles main line well enough
  // if we prioritize the first parent.

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Deep copy input swimlanes
    const inputSwimlanes = currentSwimlanes.map((s) => ({ ...s }));
    const outputSwimlanes: Swimlane[] = [];

    // 1. Determine Output Swimlanes
    // Logic:
    // - If commit is in input, that lane "consumes" the commit.
    // - Parents are added to output.
    // - First parent takes the commit's lane (continuation).
    // - Other parents get new lanes (fork/merge).

    // Find if this commit is already tracked in a swimlane
    const inputIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);

    // Determine the color for this commit
    let commitColor = "";
    if (inputIndex !== -1) {
      commitColor = inputSwimlanes[inputIndex].color;
    } else {
      // Start of a new branch tip (not seen in inputs)
      commitColor = getNextColor();
    }

    // If commit was in input, we process that lane first
    if (inputIndex !== -1) {
      // Map input lanes to output
      for (let j = 0; j < inputSwimlanes.length; j++) {
        const lane = inputSwimlanes[j];

        if (j === inputIndex) {
          // This is our commit's lane.
          // Replace it with the First Parent (if any)
          if (commit.parents.length > 0) {
            outputSwimlanes.push({
              id: commit.parents[0],
              color: lane.color, // Continue color
            });
          } else {
            // No parents (root), lane ends here.
            // Do not push to output.
          }
        } else {
          // Other lanes pass through
          outputSwimlanes.push({ ...lane });
        }
      }
    } else {
      // Commit was NOT in input (new tip).
      // We append it to the end (or find a gap? VS Code appends).
      // But wait, we are building OUTPUT lanes.

      // Copy all existing inputs to output first
      outputSwimlanes.push(...inputSwimlanes.map((s) => ({ ...s })));

      // Now add our parents
      if (commit.parents.length > 0) {
        outputSwimlanes.push({
          id: commit.parents[0],
          color: commitColor,
        });
      }
    }

    // Handle remaining parents (2nd, 3rd...) - these are merges/forks
    for (let p = 1; p < commit.parents.length; p++) {
      const parentId = commit.parents[p];
      // Check if this parent is already in output (merge into existing)
      const existingOutputIndex = outputSwimlanes.findIndex(
        (s) => s.id === parentId
      );

      if (existingOutputIndex === -1) {
        // Add new lane for this parent
        outputSwimlanes.push({
          id: parentId,
          color: getNextColor(),
        });
      }
    }

    // Consolidate: VS Code logic is slightly more complex to handle "visual" order.
    // But strictly: Input -> [Process] -> Output.

    // Optimization: If a parent is already in the input (merge), we should probably point to it?
    // In standard git graph, we just care about "where do lines go next".

    rows.push({
      commit: { ...commit, color: commitColor },
      inputSwimlanes,
      outputSwimlanes,
    });

    currentSwimlanes = outputSwimlanes;
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
