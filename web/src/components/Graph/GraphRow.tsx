import React from "react";
import type { GraphRow as GraphRowType } from "../../utils/graph";

interface GraphRowProps {
  row: GraphRowType;
  rowHeight: number;
  laneWidth: number;
}

export const GraphRow: React.FC<GraphRowProps> = ({
  row,
  rowHeight,
  laneWidth,
}) => {
  const { commit, inputSwimlanes, outputSwimlanes } = row;

  // Find the commit's lane index in input (if it exists)
  // If not in input (new tip), it will be in output?
  // Actually, for rendering the node (circle), we need to know where it sits.
  // If it was in input, it sits there.
  // If it's a new tip, it sits at the index where it was added in output.

  let circleIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);
  if (circleIndex === -1) {
    // Must be a new tip, find it in output
    // Note: In our logic, new tips are appended.
    // But we need to be careful if we added parents.
    // The commit itself "sits" at the lane that *starts* the output for its first parent?
    // Or if it has no parents, it just ends.

    // Let's look at how we constructed output.
    // If inputIndex == -1:
    // We pushed all inputs, then pushed first parent (if any).
    // So the "commit" visually sits at the lane of the first parent in output?
    // Or if no parents, it sits at the end of inputs?

    // VS Code logic: "Circle index - use the input swimlane index if present, otherwise add it to the end"
    circleIndex = inputSwimlanes.length;
  }

  const paths: React.ReactNode[] = [];

  // Dimensions
  const R = 6; // Curve radius (VS Code uses 5)
  const H = rowHeight;
  const W = laneWidth;
  const H_2 = H / 2;

  // 1. Draw connections from Input to Output

  // We iterate through inputs to map them to outputs
  // But wait, our output array construction logic was:
  // - If input[i] is commit: replace with parent 0 (or remove)
  // - Else: pass through
  // - Then append other parents
  // - Then append new tips (if we were processing them differently, but here we process row by row)

  // Re-simulating the mapping to draw lines:

  const usedOutputIndices = new Set<number>();

  for (let i = 0; i < inputSwimlanes.length; i++) {
    const inputLane = inputSwimlanes[i];
    const color = inputLane.color;
    const xInput = (i + 1) * W;

    if (inputLane.id === commit.hash) {
      // This is the current commit node.
      // It connects to Output[i] if it has a first parent?
      // In our logic: if commit has parents, outputSwimlanes[i] IS parent[0].
      // So we draw a line from Input[i] to Output[i] (straight down)

      // Draw line from Top to Middle (Node)
      paths.push(
        <path
          key={`in-${i}`}
          d={`M ${xInput} 0 L ${xInput} ${H_2}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      );

      if (commit.parents.length > 0) {
        // Draw line from Middle to Bottom (to First Parent)
        // Our logic put first parent at same index `i` in output
        paths.push(
          <path
            key={`out-straight-${i}`}
            d={`M ${xInput} ${H_2} L ${xInput} ${H}`}
            stroke={color} // Continue color
            strokeWidth={2}
            fill="none"
          />
        );
        usedOutputIndices.add(i);
      }
    } else {
      // Passthrough lane
      // In our logic, these are preserved at the same index?
      // "Other lanes pass through" -> outputSwimlanes.push({ ...lane })
      // Yes, if inputIndex < i, then output index is also i (since inputIndex was replaced or removed?)
      // Wait, if inputIndex was removed (no parents), then indices shift?
      // My logic in graph.ts:
      // if (j === inputIndex) { ... } else { outputSwimlanes.push(lane) }
      // So if inputIndex is removed, subsequent lanes shift left in output!

      // Let's find where this lane went in output.
      // It should be the same lane object (id match).
      // But multiple lanes could have same ID (merges)? No, lanes are unique by index in array.
      // We need to find the index `j` in output where `output[j].id === input[i].id` AND it's the "same" visual lane.

      // Actually, my graph.ts logic was:
      // if (j === inputIndex) ... else output.push(lane)
      // So if inputIndex was removed, index `j` maps to `j-1` in output?
      // If inputIndex was replaced, index `j` maps to `j` in output.

      // Let's calculate target index
      let targetIndex = -1;
      const isCommitLaneRemoved =
        inputSwimlanes.findIndex((s) => s.id === commit.hash) !== -1 &&
        commit.parents.length === 0;
      const commitInputIndex = inputSwimlanes.findIndex(
        (s) => s.id === commit.hash
      );

      if (commitInputIndex !== -1) {
        if (i < commitInputIndex) {
          targetIndex = i;
        } else if (i > commitInputIndex) {
          targetIndex = isCommitLaneRemoved ? i - 1 : i;
        }
      } else {
        // New tip added at end?
        // Input lanes map 1:1 to first N output lanes?
        targetIndex = i;
      }

      const xOutput = (targetIndex + 1) * W;

      if (xInput === xOutput) {
        // Straight vertical
        paths.push(
          <path
            key={`pass-${i}`}
            d={`M ${xInput} 0 L ${xInput} ${H}`}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
        );
      } else {
        // Curved shift (Bezier or Arc)
        // VS Code uses Arcs for shifts.
        // M x1 0 L x1 (H/2 - R) A R R 0 0 1 ...

        // Let's use a simple cubic bezier for smoothness if shift is small, or Arc if we want strict pipe.
        // User wants "pipe".

        // Shift logic:
        // Vertical to H/2 - R
        // Arc
        // Horizontal
        // Arc
        // Vertical

        // Simplified: Just Bezier for now, but tight one?
        // Or strict Arc implementation.

        // Let's try the Arc approach for "shift"
        // It's a bit complex to implement perfectly without helper.
        // Let's use a Cubic Bezier with control points close to the bend to simulate rounded corner.
        // M x1 0 L x1 (H/2 - R) Q x1 H/2, (x1+x2)/2 H/2 ...

        // Actually, standard S-curve is fine for shifts if they are just parallel moves.
        // But user complained about "steep".
        // The steepness comes from x distance vs y distance.
        // Here Y distance is full H (24). X distance is usually 0 or 20.

        paths.push(
          <path
            key={`pass-shift-${i}`}
            d={`M ${xInput} 0 C ${xInput} ${H / 2}, ${xOutput} ${
              H / 2
            }, ${xOutput} ${H}`}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
        );
      }
      if (targetIndex !== -1) usedOutputIndices.add(targetIndex);
    }
  }

  // 2. Draw connections for New Tips (if commit was not in input)
  if (circleIndex >= inputSwimlanes.length) {
    // It's a new tip.
    // It starts at circleIndex.
    // Draw line from Middle to Bottom (to First Parent)
    const x = (circleIndex + 1) * W;
    const color = commit.color; // We hacked this in

    // No line from top.

    if (commit.parents.length > 0) {
      // First parent is at circleIndex in output?
      // In my logic: output.push(...inputs); output.push(firstParent)
      // So yes, it maps to circleIndex in output.

      paths.push(
        <path
          key={`new-tip-out`}
          d={`M ${x} ${H_2} L ${x} ${H}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      );
      usedOutputIndices.add(circleIndex);
    }
  }

  // 3. Draw Merges/Forks (Secondary Parents)
  // These go from Node (circleIndex) to Output lanes that were NOT covered by the straight line.
  // In my logic, these were appended to outputSwimlanes.

  // We need to identify which output lanes correspond to secondary parents.
  // Iterate output lanes that are NOT in usedOutputIndices?
  // Or better: iterate commit.parents[1..N] and find them in output.

  for (let p = 1; p < commit.parents.length; p++) {
    const parentId = commit.parents[p];
    // Find this parent in outputSwimlanes
    // Be careful: duplicates? (Merge into existing lane)
    // We need to find the index that corresponds to THIS parent connection.
    // In my logic: if existing, we use it. If not, we added it.

    const targetIndex = outputSwimlanes.findIndex((s) => s.id === parentId);
    if (targetIndex !== -1) {
      const xStart = (circleIndex + 1) * W;
      const xEnd = (targetIndex + 1) * W;
      const color = commit.color; // Link color is child color? Or parent color?
      // Usually merge lines are colored by the child (the one merging IN).

      // Draw "Pipe" style connection:
      // From (xStart, H/2) to (xEnd, H)
      // Shape: Horizontal then Vertical (Rounded Corner)
      // M xStart H/2 L xEnd-R H/2 A R R 0 0 1 xEnd H/2+R L xEnd H

      const direction = xEnd > xStart ? 1 : -1;
      const r = Math.min(R, Math.abs(xEnd - xStart) / 2); // Prevent radius > half width

      // If xEnd is far, we draw:
      // M xStart H/2
      // L (xEnd - direction * r) H/2
      // Q xEnd H/2, xEnd (H/2 + r)  <-- Quadratic bezier for corner
      // L xEnd H

      paths.push(
        <path
          key={`merge-${p}`}
          d={`M ${xStart} ${H_2} L ${
            xEnd - direction * r
          } ${H_2} Q ${xEnd} ${H_2}, ${xEnd} ${H_2 + r} L ${xEnd} ${H}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      );
    }
  }

  // 4. Draw Node Circle
  const cx = (circleIndex + 1) * W;
  const cy = H_2;
  const color = commit.color;

  return (
    <g className="graph-row">
      {paths}
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />
      {/* Avatar or Initials could go here */}
    </g>
  );
};
