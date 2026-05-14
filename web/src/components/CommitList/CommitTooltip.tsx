import { RefBadge } from "@/components/Badges/RefBadge";
import type { CommitRow } from "@/graph/types";
import type { GitRefPointer } from "@git-viz/shared";

interface CommitTooltipProps {
  commit: CommitRow;
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

function relativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const delta = Date.now() - t;
  const min = Math.floor(delta / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function CommitTooltipCard({ commit }: CommitTooltipProps) {
  const subject = commit.subject.length > 80 ? `${commit.subject.slice(0, 77)}…` : commit.subject;
  const refs = commit.refs ?? [];

  return (
    <div className="flex flex-col gap-2 max-w-sm">
      <div className="font-medium text-sm leading-snug">{subject}</div>
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {refs.map((r, i) => (
            <RefBadge key={`${r.type}:${r.name}:${i}`} refName={refLabel(r)} />
          ))}
        </div>
      )}
      <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
        <div className="truncate">
          <span className="font-medium text-foreground">{commit.author}</span>
          {commit.authorEmail ? ` <${commit.authorEmail}>` : ""}
        </div>
        <div>
          {relativeDate(commit.authorDate)} ·{" "}
          <span className="font-mono">{commit.hash.slice(0, 7)}</span>
        </div>
      </div>
    </div>
  );
}
