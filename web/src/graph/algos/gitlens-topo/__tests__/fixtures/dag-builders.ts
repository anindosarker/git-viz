import type {
  GitBranch,
  GitCommitSummary,
  GitHeadState,
  GitRefsSnapshot,
  GitTag,
} from "@git-viz/shared";

export interface DagFixture {
  commits: GitCommitSummary[];
  refs: GitRefsSnapshot;
  head: GitHeadState;
}

interface PendingRef {
  type: "branch" | "remote-branch" | "tag" | "head";
  name: string;
}

interface PendingCommit {
  hash: string;
  parents: string[];
  authorDate: string;
  committerDate: string;
  author: string;
  subject: string;
  refs: PendingRef[];
}

const ISO_BASE = Date.UTC(2026, 0, 1);

function isoForIndex(idx: number): string {
  return new Date(ISO_BASE + idx * 60_000).toISOString();
}

export class DagBuilder {
  private commitsList: PendingCommit[] = [];
  private current: PendingCommit | null = null;
  private headRefName: string | null = null;
  private headHash: string | null = null;

  commit(hash: string, opts?: { author?: string; subject?: string; date?: string }): this {
    const idx = this.commitsList.length;
    this.current = {
      hash,
      parents: [],
      authorDate: opts?.date ?? isoForIndex(idx),
      committerDate: opts?.date ?? isoForIndex(idx),
      author: opts?.author ?? "a",
      subject: opts?.subject ?? hash,
      refs: [],
    };
    this.commitsList.push(this.current);
    return this;
  }

  parent(hash: string): this {
    if (!this.current) throw new Error("parent() called before commit()");
    this.current.parents.push(hash);
    return this;
  }

  parents(...hashes: string[]): this {
    if (!this.current) throw new Error("parents() called before commit()");
    this.current.parents.push(...hashes);
    return this;
  }

  refs(...names: string[]): this {
    if (!this.current) throw new Error("refs() called before commit()");
    for (const raw of names) {
      const name = raw;
      if (name === "HEAD") {
        this.headHash = this.current.hash;
        this.current.refs.push({ type: "head", name: "HEAD" });
      } else if (name.includes("/")) {
        this.current.refs.push({ type: "remote-branch", name });
      } else if (name.startsWith("tag:")) {
        this.current.refs.push({ type: "tag", name: name.slice(4) });
      } else {
        this.current.refs.push({ type: "branch", name });
      }
    }
    return this;
  }

  head(branchName: string): this {
    this.headRefName = branchName;
    return this;
  }

  date(iso: string): this {
    if (!this.current) throw new Error("date() called before commit()");
    this.current.authorDate = iso;
    this.current.committerDate = iso;
    return this;
  }

  build(): DagFixture {
    const branchTips = new Map<string, PendingCommit>();
    const remoteTips = new Map<string, PendingCommit>();
    const tagTargets = new Map<string, PendingCommit>();

    for (const c of this.commitsList) {
      for (const ref of c.refs) {
        if (ref.type === "branch") branchTips.set(ref.name, c);
        else if (ref.type === "remote-branch") remoteTips.set(ref.name, c);
        else if (ref.type === "tag") tagTargets.set(ref.name, c);
      }
    }

    let headBranch: string | undefined = this.headRefName ?? undefined;
    let headHash = this.headHash;
    if (!headBranch && !headHash) {
      // default: HEAD on first commit's first branch ref if present
      for (const c of this.commitsList) {
        const b = c.refs.find((r) => r.type === "branch");
        if (b) {
          headBranch = b.name;
          headHash = c.hash;
          break;
        }
      }
    }
    if (!headHash && headBranch) {
      const tip = branchTips.get(headBranch);
      if (tip) headHash = tip.hash;
    }
    if (!headHash) headHash = this.commitsList[0]?.hash ?? "";

    const head: GitHeadState = {
      detached: !headBranch,
      branch: headBranch,
      hash: headHash,
      shortHash: headHash.slice(0, 7),
    };

    const branches: GitBranch[] = [];
    for (const [name, tip] of branchTips) {
      branches.push({
        name,
        tip: tip.hash,
        isHead: name === headBranch,
        isRemote: false,
        lastCommitDate: tip.committerDate,
      });
    }
    for (const [name, tip] of remoteTips) {
      branches.push({
        name,
        tip: tip.hash,
        isHead: false,
        isRemote: true,
        lastCommitDate: tip.committerDate,
      });
    }

    const tags: GitTag[] = [];
    for (const [name, tip] of tagTargets) {
      tags.push({ name, target: tip.hash, annotated: false });
    }

    const refs: GitRefsSnapshot = {
      head,
      branches,
      tags,
      stashes: [],
    };

    const commits: GitCommitSummary[] = this.commitsList.map((c) => ({
      hash: c.hash,
      parents: c.parents,
      author: c.author,
      authorEmail: `${c.author}@x`,
      authorDate: c.authorDate,
      committer: c.author,
      committerEmail: `${c.author}@x`,
      committerDate: c.committerDate,
      subject: c.subject,
    }));

    return { commits, refs, head };
  }
}

export function buildDag(): DagBuilder {
  return new DagBuilder();
}
