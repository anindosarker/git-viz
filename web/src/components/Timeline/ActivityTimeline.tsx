import { useStore } from "@/state/store";
import { motion } from "framer-motion";
import React from "react";

interface Bucket {
  start: number;
  end: number;
  count: number;
  firstHash?: string;
}

function bucketKey(date: Date, mode: "month" | "week"): number {
  if (mode === "week") {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - day);
    return d.getTime();
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function formatBucketLabel(start: number, mode: "month" | "week"): string {
  const d = new Date(start);
  if (mode === "month") {
    return d.toLocaleString(undefined, { month: "short", year: "numeric" });
  }
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ActivityTimeline() {
  const commits = useStore((s) => s.commits);
  const select = useStore((s) => s.select);

  const data = React.useMemo(() => {
    if (commits.length === 0) return { buckets: [] as Bucket[], mode: "month" as const };
    const dates = commits
      .map((c) => new Date(c.authorDate).getTime())
      .filter((n) => Number.isFinite(n));
    if (dates.length === 0) return { buckets: [] as Bucket[], mode: "month" as const };
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const spanMs = max - min;
    const sixMonthsMs = 180 * 24 * 3600 * 1000;
    const mode: "month" | "week" = spanMs < sixMonthsMs ? "week" : "month";

    const map = new Map<number, Bucket>();
    // Walk commits in original order (newest first usually) — keep the LAST seen
    // (oldest) commit per bucket so click-to-scroll lands on the first commit
    // in the range.
    for (const c of commits) {
      const t = new Date(c.authorDate).getTime();
      if (!Number.isFinite(t)) continue;
      const key = bucketKey(new Date(t), mode);
      const existing = map.get(key);
      if (!existing) {
        const end =
          mode === "month"
            ? Date.UTC(new Date(key).getUTCFullYear(), new Date(key).getUTCMonth() + 1, 1)
            : key + 7 * 24 * 3600 * 1000;
        map.set(key, { start: key, end, count: 1, firstHash: c.hash });
      } else {
        existing.count += 1;
        existing.firstHash = c.hash;
      }
    }
    const buckets = Array.from(map.values()).sort((a, b) => a.start - b.start);
    return { buckets, mode };
  }, [commits]);

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  if (data.buckets.length < 2) return null;

  const width = 800; // SVG viewBox width; CSS scales to 100%
  const height = 40;
  const padX = 4;
  const padY = 4;
  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);
  const stepX = (width - padX * 2) / Math.max(1, data.buckets.length - 1);

  const points = data.buckets.map((b, i) => {
    const x = padX + i * stepX;
    const y = padY + (height - padY * 2) * (1 - b.count / maxCount);
    return { x, y, b };
  });

  // Smooth bezier path
  const pathD = points
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = arr[i - 1];
      const cx1 = (prev.x + p.x) / 2;
      return `C ${cx1.toFixed(1)} ${prev.y.toFixed(1)}, ${cx1.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;

  return (
    <motion.div
      className="border-b bg-muted/20 px-3 py-1.5 relative"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: `${height}px` }}
        aria-label="Commit activity timeline"
      >
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--vscode-charts-blue)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--vscode-charts-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#activity-fill)" />
        <path
          d={pathD}
          fill="none"
          stroke="var(--vscode-charts-blue)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - stepX / 2}
            y={0}
            width={stepX}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            onClick={() => {
              if (p.b.firstHash) select(p.b.firstHash);
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
        {hoverIdx !== null && (
          <circle
            cx={points[hoverIdx].x}
            cy={points[hoverIdx].y}
            r={3}
            fill="var(--vscode-charts-blue)"
          />
        )}
      </svg>
      {hoverIdx !== null && (
        <div
          className="absolute top-1 pointer-events-none rounded border bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 shadow-sm"
          style={{
            left: `calc(${((points[hoverIdx].x / width) * 100).toFixed(2)}% - 4px)`,
            transform: "translateX(-50%)",
          }}
        >
          {formatBucketLabel(points[hoverIdx].b.start, data.mode)} · {points[hoverIdx].b.count}{" "}
          commit{points[hoverIdx].b.count === 1 ? "" : "s"}
        </div>
      )}
    </motion.div>
  );
}
