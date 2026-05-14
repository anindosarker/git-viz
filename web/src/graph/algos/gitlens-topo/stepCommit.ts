import type { GitCommitSummary, GitHeadState, GitRefsSnapshot } from "@git-viz/shared";
import type { CommitRow, GraphNode, GraphRow, GraphRowKind } from "../../types";
import { paletteColor, getPalette } from "./colors";
import type { GitLensTopoState } from "./state";

function ensureColorForRef(state: GitLensTopoState, refName: string): string {
  const existing = state.colorMap.get(refName);
  if (existing) return existing;
  // Allocate a new color from palette beyond what's been used.
  const palette = getPalette();
  const used = new Set(state.colorMap.values());
  let idx = state.colorMap.size;
  let candidate = paletteColor(idx, palette);
  let attempts = 0;
  while (used.has(candidate) && attempts < palette.length) {
    idx++;
    candidate = paletteColor(idx, palette);
    attempts++;
  }
  state.colorMap.set(refName, candidate);
  return candidate;
}

function pickColorForCommit(
  state: GitLensTopoState,
  commit: GitCommitSummary,
  inheritedColor: string | undefined
): string {
  // 1. If commit has a ref pointing at it, use that ref's color (head ref wins if present).
  const refNames = state.refsByCommit.get(commit.hash) ?? [];
  if (refNames.length > 0) {
    // Prefer the head branch name if it points here.
    if (state.headBranchName && refNames.includes(state.headBranchName)) {
      const c = state.colorMap.get(state.headBranchName);
      if (c) return c;
    }
    for (const name of refNames) {
      const c = state.colorMap.get(name);
      if (c) return c;
    }
  }
  // 2. Otherwise inherit from the swimlane the commit sits in.
  if (inheritedColor) return inheritedColor;
  // 3. Else allocate a new palette color (rare — orphan commit).
  return ensureColorForRef(state, `__hash:${commit.hash}`);
}

function isHeadBranchCommit(state: GitLensTopoState, hash: string): boolean {
  if (!state.headBranchName) return false;
  // Head branch lane is whichever lane carries head-branch color and originated from head ref.
  // The head ref is in refsByCommit keyed by head branch name; we don't directly know
  // history. Conservative: only treat hash as head-branch-chain if a ref pointing here
  // matches headBranchName.
  const refs = state.refsByCommit.get(hash);
  return !!refs && refs.includes(state.headBranchName);
}

export interface StepResult {
  row: GraphRow;
  newState: GitLensTopoState;
}

/**
 * Single-pass step: consume one commit, produce one GraphRow, update state.
 *
 * Mutates `state` in place (caller is responsible for cloning if needed).
 */
export function stepCommit(
  commit: GitCommitSummary,
  state: GitLensTopoState,
  _refs: GitRefsSnapshot | undefined,
  head: GitHeadState | undefined
): GraphRow {
  const inputSwimlanes: GraphNode[] = state.outputSwimlanes.map((n) => ({ ...n }));

  // 1. Determine the commit's lane in the input row.
  let commitLaneIndex = inputSwimlanes.findIndex((n) => n.id === commit.hash);

  // 2. If not present, this commit is a branch tip (first appearance).
  //    Slot into reserved lane if known, else into next free index.
  if (commitLaneIndex === -1) {
    const reservedLane = state.tipLanes.get(commit.hash);
    const refsHere = state.refsByCommit.get(commit.hash) ?? [];
    const headRefHere = state.headBranchName && refsHere.includes(state.headBranchName);

    // Color for the new lane.
    const newColor = pickColorForCommit(state, commit, undefined);

    if (headRefHere) {
      // HEAD branch must occupy lane 0. Shift anything currently in lane 0 right.
      if (inputSwimlanes.length === 0) {
        inputSwimlanes.push({ id: commit.hash, color: newColor });
      } else if (inputSwimlanes[0]?.id !== commit.hash) {
        inputSwimlanes.unshift({ id: commit.hash, color: newColor });
      }
      commitLaneIndex = 0;
      // Consume tip reservation
      state.tipLanes.delete(commit.hash);
    } else if (typeof reservedLane === "number") {
      // Place at next free slot, capped at reservedLane.
      // Find leftmost empty (sparse) slot ≤ reservedLane.
      let placedAt = -1;
      // First check exact reserved slot.
      while (inputSwimlanes.length <= reservedLane) {
        // pad with an unused placeholder — represented by a no-id sentinel.
        // We avoid this by simply appending at the end and using that index.
        break;
      }
      // Try to reuse a dead slot before appending.
      for (let i = 0; i < inputSwimlanes.length; i++) {
        if (inputSwimlanes[i].id === "") {
          placedAt = i;
          break;
        }
      }
      if (placedAt === -1) {
        placedAt = inputSwimlanes.length;
        inputSwimlanes.push({ id: commit.hash, color: newColor });
      } else {
        inputSwimlanes[placedAt] = { id: commit.hash, color: newColor };
      }
      commitLaneIndex = placedAt;
      state.tipLanes.delete(commit.hash);
    } else {
      // Rootless / orphan placement.
      // Reuse a dead slot if available.
      let placedAt = -1;
      for (let i = 0; i < inputSwimlanes.length; i++) {
        if (inputSwimlanes[i].id === "") {
          placedAt = i;
          break;
        }
      }
      if (placedAt === -1) {
        placedAt = inputSwimlanes.length;
        inputSwimlanes.push({ id: commit.hash, color: newColor });
      } else {
        inputSwimlanes[placedAt] = { id: commit.hash, color: newColor };
      }
      commitLaneIndex = placedAt;
    }
  }

  // 3. Pick color for the commit (use the lane's color, but possibly override by ref).
  const laneColor = inputSwimlanes[commitLaneIndex]?.color;
  const commitColor = pickColorForCommit(state, commit, laneColor);
  // If the lane color disagrees (e.g., first time we know about ref), repaint the lane.
  if (commitLaneIndex >= 0 && inputSwimlanes[commitLaneIndex]) {
    inputSwimlanes[commitLaneIndex] = {
      ...inputSwimlanes[commitLaneIndex],
      color: commitColor,
    };
  }

  // 4. Compute outputSwimlanes.
  const outputSwimlanes: GraphNode[] = [];
  let firstParentAdded = false;
  const firstParent = commit.parents[0];

  for (let i = 0; i < inputSwimlanes.length; i++) {
    const node = inputSwimlanes[i];
    if (i === commitLaneIndex) {
      if (commit.parents.length === 0) {
        // Lane dies — leave a placeholder we can reuse, but drop trailing placeholders later.
        outputSwimlanes.push({ id: "", color: node.color });
      } else {
        // Replace with first parent, inheriting color.
        const parentColor = node.color;
        outputSwimlanes.push({ id: firstParent, color: parentColor });
        firstParentAdded = true;
      }
      continue;
    }
    // Pass through; but if a previously dead lane is here, keep its placeholder.
    outputSwimlanes.push({ ...node });
  }

  if (!firstParentAdded && firstParent) {
    // Commit lane wasn't found in input (shouldn't happen after step 2) — append.
    outputSwimlanes.push({ id: firstParent, color: commitColor });
  }

  // 5. Place additional parents (merge) into lowest free slot(s).
  for (let p = 1; p < commit.parents.length; p++) {
    const parentHash = commit.parents[p];
    // If a swimlane already has this parent, do not duplicate — merging into existing chain.
    const existing = outputSwimlanes.findIndex((n) => n.id === parentHash);
    if (existing !== -1) continue;
    // New lane: choose color for this parent. If it has a ref or there's a colorMap by hash, use it.
    const refsAtParent = state.refsByCommit.get(parentHash) ?? [];
    let parentColor: string | undefined;
    for (const rn of refsAtParent) {
      parentColor = state.colorMap.get(rn);
      if (parentColor) break;
    }
    if (!parentColor) parentColor = ensureColorForRef(state, `__hash:${parentHash}`);
    // Find leftmost dead slot
    let placedAt = -1;
    for (let i = 0; i < outputSwimlanes.length; i++) {
      if (outputSwimlanes[i].id === "") {
        placedAt = i;
        break;
      }
    }
    if (placedAt === -1) {
      placedAt = outputSwimlanes.length;
      outputSwimlanes.push({ id: parentHash, color: parentColor });
    } else {
      outputSwimlanes[placedAt] = { id: parentHash, color: parentColor };
    }
  }

  // 5b. De-duplicate output swimlanes by id (except dead placeholders).
  //     If two lanes carry the same parent hash, keep leftmost and drop the rest.
  {
    const seen = new Set<string>();
    for (let i = 0; i < outputSwimlanes.length; i++) {
      const n = outputSwimlanes[i];
      if (!n.id) continue;
      if (seen.has(n.id)) {
        outputSwimlanes[i] = { id: "", color: n.color };
      } else {
        seen.add(n.id);
      }
    }
  }

  // 6. Trim trailing dead slots (don't trim middle — preserves lane indices).
  while (outputSwimlanes.length > 0 && outputSwimlanes[outputSwimlanes.length - 1].id === "") {
    outputSwimlanes.pop();
  }

  // 7. HEAD-leftmost enforcement: if this commit is on the head branch chain and lane > 0,
  //    swap to lane 0. We track "head chain" by color match too.
  if (state.headBranchName && isHeadBranchCommit(state, commit.hash) && commitLaneIndex !== 0) {
    // Swap lanes in both input and output where the head chain currently lives.
    const tmp = inputSwimlanes[0];
    inputSwimlanes[0] = inputSwimlanes[commitLaneIndex];
    inputSwimlanes[commitLaneIndex] = tmp;
    const oTmp = outputSwimlanes[0];
    // Output index of first-parent (head chain) is currently at commitLaneIndex.
    if (outputSwimlanes[commitLaneIndex]) {
      outputSwimlanes[0] = outputSwimlanes[commitLaneIndex];
      outputSwimlanes[commitLaneIndex] = oTmp;
    }
    commitLaneIndex = 0;
  }

  // 8. Track maxLanesSeen.
  state.maxLanesSeen = Math.max(state.maxLanesSeen, inputSwimlanes.length, outputSwimlanes.length);

  // 9. Determine kind.
  const isHead = head && commit.hash === head.hash;
  const kind: GraphRowKind = isHead ? "HEAD" : "node";

  const commitRow: CommitRow = {
    ...commit,
    refs: [],
    color: commitColor,
  };

  // Update state outputs for next iteration.
  state.outputSwimlanes = outputSwimlanes.map((n) => ({ ...n }));

  return {
    kind,
    commit: commitRow,
    inputSwimlanes,
    outputSwimlanes,
    nodeColumn: commitLaneIndex,
  };
}
