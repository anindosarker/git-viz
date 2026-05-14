import { colorForIndex } from "../colors";
import type { CommitRow, GraphNode, GraphRow, GraphRowKind } from "../types";
import { registerAlgorithm } from "./registry";
import type { ComputeInput, ComputeResult, ComputeState, GraphAlgorithm } from "./types";

interface RollingState {
  colorIndex: number;
  colorMap: Map<string, string>;
  lastOutputSwimlanes: GraphNode[];
}

function isRollingState(s: ComputeState | undefined): s is RollingState {
  return (
    !!s &&
    typeof (s as RollingState).colorIndex === "number" &&
    (s as RollingState).colorMap instanceof Map &&
    Array.isArray((s as RollingState).lastOutputSwimlanes)
  );
}

function emptyState(): RollingState {
  return { colorIndex: 0, colorMap: new Map(), lastOutputSwimlanes: [] };
}

function toCommitRow(c: ComputeInput["commits"][number]): CommitRow {
  return { ...c, refs: [] };
}

function compute(input: ComputeInput): ComputeResult {
  const { commits } = input;
  const state: RollingState = isRollingState(input.prevState)
    ? {
        colorIndex: input.prevState.colorIndex,
        colorMap: new Map(input.prevState.colorMap),
        lastOutputSwimlanes: [...input.prevState.lastOutputSwimlanes],
      }
    : emptyState();

  const rows: GraphRow[] = [];
  let maxLanes = state.lastOutputSwimlanes.length;

  const nextColor = (): string => colorForIndex(state.colorIndex++);

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const inputSwimlanes: GraphNode[] =
      i === 0 ? [...state.lastOutputSwimlanes] : [...rows[i - 1].outputSwimlanes];

    const outputSwimlanes: GraphNode[] = [];
    let firstParentAdded = false;

    if (commit.parents.length > 0) {
      for (const node of inputSwimlanes) {
        if (node.id === commit.hash) {
          if (!firstParentAdded) {
            outputSwimlanes.push({ id: commit.parents[0], color: node.color });
            firstParentAdded = true;
          }
          continue;
        }
        outputSwimlanes.push({ ...node });
      }

      if (!firstParentAdded) {
        let color = state.colorMap.get(commit.parents[0]);
        if (!color) {
          color = nextColor();
          state.colorMap.set(commit.parents[0], color);
        }
        outputSwimlanes.push({ id: commit.parents[0], color });
        firstParentAdded = true;
      }
    }

    for (let p = firstParentAdded ? 1 : 0; p < commit.parents.length; p++) {
      const parentId = commit.parents[p];
      let color = state.colorMap.get(parentId);
      if (!color) {
        color = nextColor();
        state.colorMap.set(parentId, color);
      }
      outputSwimlanes.push({ id: parentId, color });
    }

    const inputIndex = inputSwimlanes.findIndex((s) => s.id === commit.hash);
    const commitColor =
      inputIndex !== -1
        ? inputSwimlanes[inputIndex].color
        : (commit.parents.length > 0 ? state.colorMap.get(commit.parents[0]) : nextColor()) ||
          nextColor();

    const nodeColumn = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;

    const commitRow: CommitRow = { ...toCommitRow(commit), color: commitColor };
    // Preserve any commit-level kind hint (e.g. "stash") from the input.
    const inputKind = (commit as { kind?: GraphRowKind }).kind;

    rows.push({
      kind: inputKind ?? "node",
      commit: commitRow,
      inputSwimlanes,
      outputSwimlanes,
      nodeColumn,
    });

    maxLanes = Math.max(maxLanes, inputSwimlanes.length, outputSwimlanes.length);
  }

  state.lastOutputSwimlanes = rows.length > 0 ? [...rows[rows.length - 1].outputSwimlanes] : [];

  return { rows, state, laneCount: maxLanes };
}

export const rollingAlgorithm: GraphAlgorithm = {
  id: "rolling",
  label: "Rolling",
  description: "Single-pass swimlane allocator. Preserves color through first-parent chains.",
  compute,
};

registerAlgorithm(rollingAlgorithm);
