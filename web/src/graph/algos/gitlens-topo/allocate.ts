import type { GitBranch, GitHeadState, GitRefsSnapshot } from "@git-viz/shared";
import { getHeadBranchColor, getPalette, paletteColor } from "./colors";

export interface OrderedRef {
  name: string;
  commitHash: string;
  kind: "head" | "local" | "remote-tracking" | "other-remote" | "tag";
}

export interface TipAllocation {
  /** ordered refs in priority order (HEAD first) */
  orderedRefs: OrderedRef[];
  /** ref.name → color */
  colorMap: Map<string, string>;
  /** commit hash → reserved lane index (first ref that names it wins) */
  tipLanes: Map<string, number>;
  /** head branch name if attached */
  headBranchName?: string;
  /** head commit hash */
  headCommit: string;
}

function isRemoteTracking(b: GitBranch, locals: GitBranch[]): boolean {
  if (!b.isRemote) return false;
  // Treat as "remote-tracking" if there's a local branch whose upstream is this
  // ref OR a local branch with matching basename. Heuristic, but adequate.
  const base = b.name.includes("/") ? b.name.split("/").slice(1).join("/") : b.name;
  return locals.some(
    (l) => l.upstream === b.name || l.name === base
  );
}

export function allocateLanes(
  refs: GitRefsSnapshot | undefined,
  head: GitHeadState | undefined
): TipAllocation {
  const ordered: OrderedRef[] = [];
  const colorMap = new Map<string, string>();
  const tipLanes = new Map<string, number>();

  const palette = getPalette();
  const headColor = getHeadBranchColor();

  if (!refs && !head) {
    return { orderedRefs: ordered, colorMap, tipLanes, headCommit: "" };
  }

  const headState = head ?? refs?.head;
  const headBranchName = headState?.branch;
  const headHash = headState?.hash ?? "";

  const branches = refs?.branches ?? [];
  const tags = refs?.tags ?? [];

  const localBranches = branches.filter((b) => !b.isRemote);

  // 1. HEAD ref — either the head branch (if attached) or a synthetic detached pointer.
  if (headBranchName) {
    const headBranch =
      branches.find((b) => !b.isRemote && b.name === headBranchName) ??
      ({ name: headBranchName, tip: headHash, isHead: true, isRemote: false, lastCommitDate: "" } as GitBranch);
    ordered.push({ name: headBranch.name, commitHash: headBranch.tip || headHash, kind: "head" });
  } else if (headHash) {
    ordered.push({ name: "HEAD", commitHash: headHash, kind: "head" });
  }

  // 2. Local branches by recent commit date desc (excluding head branch)
  const otherLocals = localBranches
    .filter((b) => b.name !== headBranchName)
    .slice()
    .sort((a, b) => {
      // newest first
      const ad = a.lastCommitDate || "";
      const bd = b.lastCommitDate || "";
      if (ad === bd) return a.name.localeCompare(b.name);
      return ad < bd ? 1 : -1;
    });
  for (const b of otherLocals) {
    ordered.push({ name: b.name, commitHash: b.tip, kind: "local" });
  }

  // 3. Remote tracking branches (remotes that correspond to a local)
  const remoteBranches = branches.filter((b) => b.isRemote);
  const remoteTracking = remoteBranches.filter((b) => isRemoteTracking(b, localBranches));
  const otherRemotes = remoteBranches.filter((b) => !isRemoteTracking(b, localBranches));

  const dateSort = (a: GitBranch, b: GitBranch): number => {
    const ad = a.lastCommitDate || "";
    const bd = b.lastCommitDate || "";
    if (ad === bd) return a.name.localeCompare(b.name);
    return ad < bd ? 1 : -1;
  };

  for (const b of remoteTracking.slice().sort(dateSort)) {
    ordered.push({ name: b.name, commitHash: b.tip, kind: "remote-tracking" });
  }

  // 4. Other remotes
  for (const b of otherRemotes.slice().sort(dateSort)) {
    ordered.push({ name: b.name, commitHash: b.tip, kind: "other-remote" });
  }

  // 5. Tags
  for (const t of tags.slice().sort((a, b) => a.name.localeCompare(b.name))) {
    ordered.push({ name: t.name, commitHash: t.target, kind: "tag" });
  }

  // Assign colors and tip lane reservations.
  for (let i = 0; i < ordered.length; i++) {
    const ref = ordered[i];
    if (ref.kind === "head") {
      colorMap.set(ref.name, headColor);
    } else {
      colorMap.set(ref.name, paletteColor(i - 1, palette));
    }
  }

  // tipLanes: only the FIRST ref naming a commit reserves a lane.
  // Lane indices are dense in ordering — but we want the lane index to track
  // *unique* commit tips, so we assign next lane each time we see a new commit hash.
  let nextLane = 0;
  for (const ref of ordered) {
    if (!tipLanes.has(ref.commitHash)) {
      tipLanes.set(ref.commitHash, nextLane++);
    }
  }

  return {
    orderedRefs: ordered,
    colorMap,
    tipLanes,
    headBranchName,
    headCommit: headHash,
  };
}
