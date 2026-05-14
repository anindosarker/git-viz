import type {
  GitCommitSummary,
  GitHeadState,
  GitRefPointer,
  GitRefsSnapshot,
} from "@git-viz/shared";
import type { CommitRow } from "./types";

export interface JoinOptions {
  commits: GitCommitSummary[];
  refs?: GitRefsSnapshot;
  head?: GitHeadState;
  /** Prepend a working-tree synthetic row if the repo is dirty */
  workingTreeDirty?: boolean;
}

function indexRefsByHash(refs?: GitRefsSnapshot): Map<string, GitRefPointer[]> {
  const map = new Map<string, GitRefPointer[]>();
  if (!refs) return map;
  const push = (r: GitRefPointer) => {
    const list = map.get(r.commitHash);
    if (list) list.push(r);
    else map.set(r.commitHash, [r]);
  };
  for (const b of refs.branches) {
    push({
      type: b.isRemote ? "remote-branch" : "branch",
      name: b.name,
      commitHash: b.tip,
      isHead: b.isHead,
    });
  }
  for (const t of refs.tags) {
    push({ type: "tag", name: t.name, commitHash: t.target });
  }
  if (refs.head && !refs.head.detached) {
    push({
      type: "head",
      name: refs.head.branch ?? "HEAD",
      commitHash: refs.head.hash,
      isHead: true,
    });
  }
  return map;
}

/**
 * Join refs onto commits to produce CommitRow[]. Working-tree row optionally
 * prepended (synthesized via a placeholder hash so renderers know to draw it
 * with `kind: 'working-tree'`).
 */
export interface JoinedRow {
  commit: CommitRow;
  kind: "HEAD" | "node" | "working-tree";
}

export const WORKING_TREE_HASH = "__working-tree__";

export function joinCommits(opts: JoinOptions): JoinedRow[] {
  const { commits, refs, head, workingTreeDirty } = opts;
  const byHash = indexRefsByHash(refs);
  const headHash = head?.hash ?? refs?.head?.hash;

  const out: JoinedRow[] = [];
  if (workingTreeDirty && headHash) {
    const headParent = commits.find((c) => c.hash === headHash)?.hash ?? headHash;
    out.push({
      kind: "working-tree",
      commit: {
        hash: WORKING_TREE_HASH,
        parents: [headParent],
        author: "",
        authorEmail: "",
        authorDate: "",
        committer: "",
        committerEmail: "",
        committerDate: "",
        subject: "Working tree changes",
        refs: [],
      },
    });
  }

  for (const c of commits) {
    out.push({
      kind: c.hash === headHash ? "HEAD" : "node",
      commit: { ...c, refs: byHash.get(c.hash) ?? [] },
    });
  }
  return out;
}
