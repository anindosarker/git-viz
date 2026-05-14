import type { GitCommitDetails, GitCommitSummary, GitRefPointer } from "@git-viz/shared";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import React from "react";
import { RefBadge } from "../Badges/RefBadge";

interface CommitMetaProps {
  commit: GitCommitSummary;
  details?: GitCommitDetails;
  refs?: GitRefPointer[];
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = (Date.now() - t) / 1000;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "ago" : "from now";
  const tiers: Array<[number, string]> = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2629800, "w"],
    [31557600, "mo"],
    [Infinity, "y"],
  ];
  let prev = 1;
  for (const [limit, unit] of tiers) {
    if (abs < limit) {
      return `${Math.floor(abs / prev)}${unit} ${sign}`;
    }
    prev = limit;
  }
  return iso;
}

function SignatureBadge({ details }: { details?: GitCommitDetails }) {
  if (!details || details.signature.status === "none") return null;
  const { status, signer } = details.signature;
  const map = {
    good: {
      icon: <ShieldCheck className="h-3 w-3" />,
      label: "Verified",
      cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    },
    bad: {
      icon: <ShieldAlert className="h-3 w-3" />,
      label: "Bad signature",
      cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    },
    untrusted: {
      icon: <ShieldQuestion className="h-3 w-3" />,
      label: "Untrusted",
      cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    },
  } as const;
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${cfg.cls}`}
      title={signer ? `${cfg.label} — ${signer}` : cfg.label}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}

function refLabel(ref: GitRefPointer): string {
  switch (ref.type) {
    case "head":
      return "HEAD";
    case "tag":
      return `tag: ${ref.name}`;
    default:
      return ref.name;
  }
}

export const CommitMeta: React.FC<CommitMetaProps> = ({ commit, details, refs }) => {
  const sameCommitter =
    commit.author === commit.committer && commit.authorEmail === commit.committerEmail;

  return (
    <div className="px-3 py-2 border-b bg-background/50 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div>
          <span className="text-muted-foreground mr-1">Author</span>
          <span className="select-all">
            {commit.author} &lt;{commit.authorEmail}&gt;
          </span>
          <span className="text-muted-foreground ml-2" title={commit.authorDate}>
            {relativeTime(commit.authorDate)}
          </span>
        </div>
        {!sameCommitter && (
          <div>
            <span className="text-muted-foreground mr-1">Committer</span>
            <span className="select-all">
              {commit.committer} &lt;{commit.committerEmail}&gt;
            </span>
            <span className="text-muted-foreground ml-2" title={commit.committerDate}>
              {relativeTime(commit.committerDate)}
            </span>
          </div>
        )}
        <SignatureBadge details={details} />
        {commit.parents.length > 0 && (
          <div>
            <span className="text-muted-foreground mr-1">
              {commit.parents.length > 1 ? "Parents" : "Parent"}
            </span>
            <span className="font-mono select-all">
              {commit.parents.map((p) => p.slice(0, 7)).join(", ")}
            </span>
          </div>
        )}
        {refs && refs.length > 0 && (
          <div className="flex items-center gap-1">
            {refs.map((r, i) => (
              <RefBadge key={i} refName={refLabel(r)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
