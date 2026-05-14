import type { GitHeadState } from "@git-viz/shared";
import type { CommitRow, GraphRow } from "../../types";
import type { ComputeInput, ComputeResult } from "../types";
import { cloneState, initialState, isGitLensTopoState, type GitLensTopoState } from "./state";
import { stepCommit } from "./stepCommit";

function makeWorkingTreeRow(
  head: GitHeadState,
  state: GitLensTopoState
): GraphRow {
  const headColor = state.colorMap.get(state.headBranchName ?? "") ?? "#3794ff";
  const commit: CommitRow = {
    hash: `working-tree:${head.hash}`,
    parents: [head.hash],
    author: "",
    authorEmail: "",
    authorDate: "",
    committer: "",
    committerEmail: "",
    committerDate: "",
    subject: "Working Tree",
    refs: [],
    color: headColor,
  };
  // Pre-place the head pointer at lane 0 in the output if not there.
  const outputSwimlanes = state.outputSwimlanes.length
    ? state.outputSwimlanes.map((n) => ({ ...n }))
    : [{ id: head.hash, color: headColor }];
  if (outputSwimlanes[0]?.id !== head.hash) {
    outputSwimlanes.unshift({ id: head.hash, color: headColor });
  }
  state.outputSwimlanes = outputSwimlanes.map((n) => ({ ...n }));

  return {
    kind: "working-tree",
    commit,
    inputSwimlanes: [],
    outputSwimlanes,
    nodeColumn: 0,
  };
}

export function compute(input: ComputeInput): ComputeResult {
  const { commits, refs, head, workingTree, prevState } = input;

  const state: GitLensTopoState = isGitLensTopoState(prevState)
    ? cloneState(prevState)
    : initialState(refs, head);

  const rows: GraphRow[] = [];

  const isFirstPage = !isGitLensTopoState(prevState);

  if (isFirstPage && workingTree?.dirty && head) {
    rows.push(makeWorkingTreeRow(head, state));
    state.workingTreeEmitted = true;
  }

  for (const commit of commits) {
    const row = stepCommit(commit, state, refs, head);
    rows.push(row);
  }

  return { rows, state, laneCount: state.maxLanesSeen };
}
