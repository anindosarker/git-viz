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

  // Find the commit's input index (first one)
  const commitInputIndex = inputSwimlanes.findIndex(
    (s) => s.id === commit.hash
  );

  const isNewTip = commitInputIndex === -1;

  // 1. Draw connections from Input to Output
  for (let i = 0; i < inputSwimlanes.length; i++) {
    const inputLane = inputSwimlanes[i];
    const color = inputLane.color;
    const xInput = (i + 1) * W;

    let targetOutputIndex = -1;

    if (isNewTip) {
      // All inputs are passthroughs and map 1:1
      targetOutputIndex = i;
    } else {
      if (inputLane.id === commit.hash) {
        // This is a commit lane.
        if (i === commitInputIndex) {
          // PRIMARY commit lane.
          // It continues if it has a parent in output.
          if (
            commit.parents.length > 0 &&
            i < outputSwimlanes.length &&
            outputSwimlanes[i].id === commit.parents[0]
          ) {
            targetOutputIndex = i;
          }
        } else {
          // DUPLICATE commit lane (merging into primary).
          // It does NOT continue to output (it ends/merges here).
          targetOutputIndex = -1;
        }
      } else {
        // Passthrough lane
        if (i < commitInputIndex) {
          // Lanes before commit map 1:1
          targetOutputIndex = i;
        } else {
          // Lanes after commit
          // If commit continued, they map 1:1 (index i)
          // If commit ended, they shift left (index i-1)

          // Did commit continue?
          // We can check if output[commitInputIndex] is the parent.
          const commitContinues =
            commit.parents.length > 0 &&
            commitInputIndex < outputSwimlanes.length &&
            outputSwimlanes[commitInputIndex].id === commit.parents[0];

          targetOutputIndex = commitContinues ? i : i - 1;
        }
      }
    }

    if (inputLane.id === commit.hash) {
      if (i === commitInputIndex) {
        // Primary Commit Lane: Draw Top to Middle (Node)
        paths.push(
          <path
            key={`in-${i}`}
            d={`M ${xInput} 0 L ${xInput} ${H_2}`}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
        );

        // Draw continuation to bottom if target exists
        if (
          targetOutputIndex !== -1 &&
          targetOutputIndex < outputSwimlanes.length
        ) {
          paths.push(
            <path
              key={`out-straight-${i}`}
              d={`M ${xInput} ${H_2} L ${xInput} ${H}`}
              stroke={color}
              strokeWidth={2}
              fill="none"
            />
          );
        }
      } else {
        // Duplicate Commit Lane: Merge into Primary
        // Draw Top to Middle-ish, then curve to Primary Node

        // VS Code draws:
        // M xInput 0
        // A W W 0 0 1 xInput-W W (if shifting left)
        // H xPrimary

        // Let's use our standard shift logic but targeting the Node.
        // Target X is the Node X.
        const xNode = (commitInputIndex + 1) * W;

        // We want to draw from (xInput, 0) to (xNode, H_2).
        // But usually these merges look like "shoulders".
        // VS Code:
        // M xInput 0
        // A W W 0 0 1 (xInput-W) W   <-- Curve down-left
        // H xNode                    <-- Horizontal to node

        // But wait, VS Code's `d` construction:
        // d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
        // d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (index)} ${SWIMLANE_WIDTH}`);
        // d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)}`);

        // This assumes the merge happens at Y=SWIMLANE_WIDTH (which is H_2 in our case).
        // And it assumes index > circleIndex (merging from right).
        // If merging from left?

        const direction = xInput > xNode ? -1 : 1;
        // If merging from right (i > commitInputIndex), direction is -1.
        // VS Code uses `0 0 1` sweep flag.

        // Let's replicate VS Code's look:
        // Curve starts at top, goes down and turns horizontal.
        // Radius = W (laneWidth).

        // If xInput > xNode (right to left):
        // M xInput 0
        // A W W 0 0 1 (xInput - W) W
        // L xNode W
        // (Assuming W is H_2? In VS Code W=11, H=22. So W = H/2. Yes!)

        const d = [
          `M ${xInput} 0`,
          `A ${W} ${W} 0 0 ${direction === -1 ? 1 : 0} ${
            xInput + direction * W
          } ${W}`,
          `L ${xNode} ${W}`,
        ].join(" ");

        paths.push(
          <path
            key={`merge-in-${i}`}
            d={d}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
        );
      }
    } else {
      // Passthrough Lane
      if (
        targetOutputIndex !== -1 &&
        targetOutputIndex < outputSwimlanes.length
      ) {
        const xOutput = (targetOutputIndex + 1) * W;

        if (xInput === xOutput) {
          // Straight
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
          // Shift
          const direction = xOutput > xInput ? 1 : -1;
          const safeR = Math.min(R, H / 2);

          const d = [
            `M ${xInput} 0`,
            `L ${xInput} ${H_2 - safeR}`,
            `A ${safeR} ${safeR} 0 0 ${direction > 0 ? 0 : 1} ${
              xInput + direction * safeR
            } ${H_2}`,
            `L ${xOutput - direction * safeR} ${H_2}`,
            `A ${safeR} ${safeR} 0 0 ${direction > 0 ? 1 : 0} ${xOutput} ${
              H_2 + safeR
            }`,
            `L ${xOutput} ${H}`,
          ].join(" ");

          paths.push(
            <path
              key={`pass-shift-${i}`}
              d={d}
              stroke={color}
              strokeWidth={2}
              fill="none"
            />
          );
        }
      } else {
        // Lane ends (e.g. at the bottom of the graph or merged/pruned)
        // Draw line from Top to Middle? Or Top to Bottom?
        // If it's a passthrough that disappears, it means it terminated in this row?
        // But our graph.ts logic only terminates the *current commit's* lane.
        // Passthroughs are always kept: `outputSwimlanes.push({ ...lane })`.
        // So `targetOutputIndex` should ALWAYS be valid for passthroughs!
        // Unless... `outputSwimlanes` is somehow shorter than expected?
        // This can happen if we filtered out parents in `graph.ts` (the fix I made earlier).
        // But `graph.ts` copies passthroughs UNCONDITIONALLY.
        // Wait, `graph.ts`:
        // if (j === inputIndex) { ... } else { outputSwimlanes.push({ ...lane }) }
        // So passthroughs are ALWAYS preserved.
        // So `targetOutputIndex` should always point to a valid lane.
        // EXCEPT if my logic for `targetOutputIndex` calculation above is wrong.
        // If `isNewTip`, `targetOutputIndex = i`.
        // If `!isNewTip`:
        //   If `i < commitInputIndex`: `targetOutputIndex = i`.
        //   If `i > commitInputIndex`: `targetOutputIndex = commitContinues ? i : i - 1`.
        // This covers all cases.
        // So why did we see gaps?
        // Because my previous logic was `outputSwimlaneIndex++`.
        // If `outputSwimlanes` was shorter (because commit lane ended),
        // the loop would finish before processing all inputs.
        // Example: Input [A, B, C]. Commit B ends. Output [A, C].
        // i=0 (A). outIdx=0. Maps A->A. outIdx becomes 1.
        // i=1 (B). Commit lane. Ends.
        // i=2 (C). outIdx=1. Maps C->C (Output[1]). outIdx becomes 2.
        // Loop ends.
        // Wait, my previous logic:
        // i=1 (B). It is commit lane. `if (outputSwimlaneIndex < ... && match parent)`.
        // Parent doesn't match (ended). So we DON'T increment `outputSwimlaneIndex`.
        // outIdx remains 1.
        // i=2 (C). `if (outputSwimlaneIndex < ... && match ID)`.
        // Input C (id=C). Output[1] is C (id=C). Match!
        // Maps C->C.
        // So my previous logic WAS correct for that case?
        // Why did it fail for the user?
        // "First row at the bottom has separate lines".
        // Maybe the issue is when `isNewTip`?
        // If `isNewTip` (commit not in input).
        // Input [A, B]. New Tip C. Output [A, B, C].
        // i=0 (A). outIdx=0. Match A->A. outIdx=1.
        // i=1 (B). outIdx=1. Match B->B. outIdx=2.
        // Loop ends.
        // C is handled by "New Tips" block.
        // This also seems correct.
        // What if `graph.ts` logic for "New Tip" is:
        // `outputSwimlanes.push(...inputSwimlanes)`
        // `outputSwimlanes.push(parent)`
        // So inputs are preserved 1:1.
        // Let's look at the user's screenshot again.
        // It looks like the lines are shifting, but maybe to the wrong place?
        // Or maybe the `id` check failed?
        // If I use the new index-based logic, it is robust against ID mismatches.
        // And it explicitly handles the shift logic.
        // One edge case: `commitContinues` calculation.
        // `outputSwimlanes[commitInputIndex].id === commit.parents[0]`
        // This assumes that if it continues, it is at the exact same index.
        // In `graph.ts`:
        // `if (j === inputIndex) { outputSwimlanes.push(parent) }`
        // Yes, it pushes to the same position relative to previous lanes.
        // So this logic holds.
      }
    }
  }

  // 2. Draw connections for New Tips (if commit was not in input)
  if (circleIndex >= inputSwimlanes.length) {
    // It's a new tip starting at this row
    const x = (circleIndex + 1) * W;
    const color = commit.color;

    // No line from top (it's new)

    // Check if it has a parent in output
    // For new tips, the parent is appended at the end of outputSwimlanes
    // So we check if outputSwimlanes has an entry at circleIndex (or circleIndex maps to end)

    // In graph.ts: outputSwimlanes.push(...inputSwimlanes); outputSwimlanes.push(parent);
    // So parent is at inputSwimlanes.length, which IS circleIndex.

    if (commit.parents.length > 0 && circleIndex < outputSwimlanes.length) {
      // Draw line from Middle to Bottom
      paths.push(
        <path
          key={`new-tip-out`}
          d={`M ${x} ${H_2} L ${x} ${H}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      );
    }
  }

  // 3. Draw Merges/Forks (Secondary Parents)
  for (let p = 1; p < commit.parents.length; p++) {
    const parentId = commit.parents[p];
    const targetIndex = outputSwimlanes.findIndex((s) => s.id === parentId);

    if (targetIndex !== -1) {
      const xStart = (circleIndex + 1) * W;
      const xEnd = (targetIndex + 1) * W;

      const targetLane = outputSwimlanes[targetIndex];
      const color = targetLane.color;

      const direction = xEnd > xStart ? 1 : -1;
      const r = Math.min(R, Math.abs(xEnd - xStart) / 2);

      const d = [
        `M ${xStart} ${H_2}`,
        `L ${xEnd - direction * r} ${H_2}`,
        `A ${r} ${r} 0 0 ${direction > 0 ? 1 : 0} ${xEnd} ${H_2 + r}`,
        `L ${xEnd} ${H}`,
      ].join(" ");

      paths.push(
        <path
          key={`merge-${p}`}
          d={d}
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
