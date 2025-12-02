import React from "react";
import type { GraphRow as GraphRowType } from "../../utils/graph";

interface GraphRowProps {
  row: GraphRowType;
  rowHeight: number;
  totalHeight?: number;
  laneWidth: number;
}

export const GraphRow: React.FC<GraphRowProps> = ({
  row,
  rowHeight,
  totalHeight,
  laneWidth,
}) => {
  const { commit, inputSwimlanes, outputSwimlanes } = row;

  // Dimensions
  const R = 5; // Curve radius
  const H = totalHeight || rowHeight;
  const W = laneWidth;
  const H_2 = H / 2;

  // Find where this commit appears in the input swimlanes
  const inputIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);

  // Determine circle position (column index)
  const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;

  // Determine circle color
  const circleColor =
    circleIndex < outputSwimlanes.length
      ? outputSwimlanes[circleIndex].color
      : circleIndex < inputSwimlanes.length
      ? inputSwimlanes[circleIndex].color
      : commit.color || "#888";

  const paths: React.ReactNode[] = [];
  let outputSwimlaneIndex = 0;

  // STEP 1: Draw lines for all input swimlanes
  for (let i = 0; i < inputSwimlanes.length; i++) {
    const color = inputSwimlanes[i].color;
    const xInput = W * (i + 1);

    if (inputSwimlanes[i].id === commit.hash) {
      // This is the current commit's swimlane
      if (i !== circleIndex) {
        // Duplicate commit lane (merge curve to main circle)
        const xCircle = W * (circleIndex + 1);
        const arcRadius = Math.min(W, H_2);

        let d: string;
        if (xInput > xCircle) {
          // Input is to the RIGHT -> Curve LEFT
          d = [
            `M ${xInput} 0`,
            `V ${H_2 - arcRadius}`,
            `A ${arcRadius} ${arcRadius} 0 0 1 ${xInput - arcRadius} ${H_2}`,
            `H ${xCircle}`,
          ].join(" ");
        } else {
          // Input is to the LEFT -> Curve RIGHT
          d = [
            `M ${xInput} 0`,
            `V ${H_2 - arcRadius}`,
            `A ${arcRadius} ${arcRadius} 0 0 0 ${xInput + arcRadius} ${H_2}`,
            `H ${xCircle}`,
          ].join(" ");
        }

        paths.push(
          <path
            key={`merge-in-${i}`}
            d={d}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />
        );
      } else {
        outputSwimlaneIndex++;
      }
    } else {
      // Not the current commit - check if it continues to output
      if (
        outputSwimlaneIndex < outputSwimlanes.length &&
        inputSwimlanes[i].id === outputSwimlanes[outputSwimlaneIndex].id
      ) {
        const xOutput = W * (outputSwimlaneIndex + 1);

        if (i === outputSwimlaneIndex) {
          // Straight line down
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
          // Lane shift: draw S-curve
          const direction = outputSwimlaneIndex > i ? 1 : -1;
          const safeR = Math.min(R, H_2);

          const d = [
            `M ${xInput} 0`,
            `V 6`,
            `A ${safeR} ${safeR} 0 0 ${direction > 0 ? 1 : 0} ${
              xInput + direction * safeR
            } ${H_2}`,
            `H ${xOutput - direction * safeR}`,
            `A ${safeR} ${safeR} 0 0 ${direction > 0 ? 0 : 1} ${xOutput} ${
              H_2 + safeR
            }`,
            `V ${H}`,
          ].join(" ");

          paths.push(
            <path
              key={`shift-${i}`}
              d={d}
              stroke={color}
              strokeWidth={2}
              fill="none"
            />
          );
        }

        outputSwimlaneIndex++;
      }
    }
  }

  // STEP 2: Draw lines for additional parents (merge commits)
  for (let p = 1; p < commit.parents.length; p++) {
    const parentId = commit.parents[p];

    // Find last occurrence of this parent in output swimlanes
    let parentOutputIndex = -1;
    for (let i = outputSwimlanes.length - 1; i >= 0; i--) {
      if (outputSwimlanes[i].id === parentId) {
        parentOutputIndex = i;
        break;
      }
    }

    if (parentOutputIndex === -1) continue;

    const color = outputSwimlanes[parentOutputIndex].color;
    const xCircle = W * (circleIndex + 1);
    const xParent = W * (parentOutputIndex + 1);

    // GitLens uses a tighter curve for merges
    const arcRadius = Math.min(W, H_2);

    let d: string;
    if (xParent > xCircle) {
      // Parent is to the RIGHT
      d = [
        `M ${xCircle} ${H_2}`,
        `H ${xParent - arcRadius}`,
        `A ${arcRadius} ${arcRadius} 0 0 1 ${xParent} ${H_2 + arcRadius}`,
        `V ${H}`,
      ].join(" ");
    } else {
      // Parent is to the LEFT
      d = [
        `M ${xCircle} ${H_2}`,
        `H ${xParent + arcRadius}`,
        `A ${arcRadius} ${arcRadius} 0 0 0 ${xParent} ${H_2 + arcRadius}`,
        `V ${H}`,
      ].join(" ");
    }

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

  // STEP 3: Draw vertical line TO the circle (from top)
  if (inputIndex !== -1) {
    const xCircle = W * (circleIndex + 1);
    paths.push(
      <path
        key="to-circle"
        d={`M ${xCircle} 0 L ${xCircle} ${H_2}`}
        stroke={inputSwimlanes[inputIndex].color}
        strokeWidth={2}
        fill="none"
      />
    );
  }

  // STEP 4: Draw vertical line FROM the circle (to bottom)
  if (commit.parents.length > 0) {
    const xCircle = W * (circleIndex + 1);
    paths.push(
      <path
        key="from-circle"
        d={`M ${xCircle} ${H_2} L ${xCircle} ${H}`}
        stroke={circleColor}
        strokeWidth={2}
        fill="none"
      />
    );
  }

  // STEP 5: Draw the commit circle (avatar)
  const cx = W * (circleIndex + 1);
  const cy = H_2;

  // Extract initials from author name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <g className="graph-row">
      {paths}

      {/* Background circle with branch color */}
      <circle cx={cx} cy={cy} r={8} fill={circleColor} />

      {/* Avatar or Initials */}
      {commit.authorAvatar ? (
        <>
          {/* Clip path for circular avatar */}
          <defs>
            <clipPath id={`clip-${commit.hash}`}>
              <circle cx={cx} cy={cy} r={7} />
            </clipPath>
          </defs>
          <image
            href={commit.authorAvatar}
            x={cx - 7}
            y={cy - 7}
            width={14}
            height={14}
            clipPath={`url(#clip-${commit.hash})`}
          />
        </>
      ) : (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fill="white"
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {getInitials(commit.author)}
        </text>
      )}
    </g>
  );
};
