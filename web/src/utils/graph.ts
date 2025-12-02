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

  // Build a Set of commit hashes for quick lookup
  const commitSet = new Set(commits.map((c) => c.hash));

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Deep copy input swimlanes
    const inputSwimlanes = currentSwimlanes.map((s) => ({ ...s }));
    const outputSwimlanes: Swimlane[] = [];

    // 1. Determine Output Swimlanes
    let firstParentAdded = false;
    let commitWasInInput = false;

    // Map input lanes to output
    for (let j = 0; j < inputSwimlanes.length; j++) {
      const lane = inputSwimlanes[j];

      if (lane.id === commit.hash) {
        commitWasInInput = true;
        // This is our commit's lane (or one of them).

        if (!firstParentAdded) {
          // Replace it with the First Parent (if any AND if it exists in our commit list)
          if (commit.parents.length > 0 && commitSet.has(commit.parents[0])) {
            // Check if this parent is already in output (to avoid duplicates)
            // Note: In this loop, we are building output. If we have multiple lanes merging into one parent,
            // we might add it multiple times if we are not careful?
            // But here we only do this ONCE (when !firstParentAdded).
            // Subsequent matching lanes will just be consumed (merged).

            outputSwimlanes.push({
              id: commit.parents[0],
              color: lane.color, // Continue color
            });
          }
          firstParentAdded = true;
        } else {
          // Duplicate lane for this commit (merge from previous split).
          // It is consumed here. We don't add anything to output.
        }
      } else {
        // Other lanes pass through
        outputSwimlanes.push({ ...lane });
      }
    }

    // Determine color
    // If commit was in input, use that color (we can grab it from inputSwimlanes)
    // If not, generate new.
    let commitColor = "";
    const inputIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);
    if (inputIndex !== -1) {
      commitColor = inputSwimlanes[inputIndex].color;
    } else {
      commitColor = getNextColor();
    }

    if (!commitWasInInput) {
      // Commit was NOT in input (new tip).
      // We append it to the end (or find a gap? VS Code appends).

      // Copy all existing inputs to output first?
      // Wait, we already iterated inputs and pushed them to output (since they didn't match commit.hash).
      // So outputSwimlanes currently contains all passthroughs.

      // Now add our parents (only if they exist in the commit list)
      if (commit.parents.length > 0 && commitSet.has(commit.parents[0])) {
        // Check if this parent is already in output (to avoid duplicates)
        const existingIndex = outputSwimlanes.findIndex(
          (s) => s.id === commit.parents[0]
        );

        if (existingIndex === -1) {
          outputSwimlanes.push({
            id: commit.parents[0],
            color: commitColor,
          });
        }
      }
    }

    // Handle remaining parents (2nd, 3rd...) - these are merges/forks
    for (let p = 1; p < commit.parents.length; p++) {
      const parentId = commit.parents[p];

      // Only process this parent if it exists in our commit list
      if (!commitSet.has(parentId)) continue;

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
