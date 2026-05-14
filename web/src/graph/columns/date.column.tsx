import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

type DateFormat = "relative" | "abs" | "iso";

function relative(d: Date, now: Date): string {
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return diffSec < 0 ? "in a few seconds" : "just now";
  const mins = Math.round(abs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
}

const Component: React.FC<ColumnRendererProps> = ({ row, context }) => {
  const iso = row.commit.authorDate;
  if (!iso) return null;
  const format = (context?.dateFormat ?? "relative") as DateFormat;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let text: string;
  if (format === "iso") text = d.toISOString();
  else if (format === "abs") text = d.toLocaleString();
  else text = relative(d, new Date());
  return (
    <div className="text-xs text-muted-foreground" title={d.toLocaleString()}>
      {text}
    </div>
  );
};
Component.displayName = "DateColumn";

export const dateColumn: ColumnDefinition = {
  id: "date",
  label: "Date",
  defaultWidth: 150,
  Component,
};

registerColumn(dateColumn);
