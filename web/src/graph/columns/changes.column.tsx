import { gitService } from "@/services/git.service";
import { useQuery } from "@tanstack/react-query";
import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const hash = row.commit.hash;
  const isSynthetic = hash.startsWith("__");
  const { data } = useQuery({
    queryKey: ["commitDetails", hash],
    queryFn: () => gitService.getCommitDetails(hash),
    enabled: !isSynthetic,
    staleTime: 60_000,
  });

  if (!data) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const { files, insertions, deletions } = data.stats;
  const total = insertions + deletions || 1;
  const insPct = Math.round((insertions / total) * 100);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground tabular-nums">{files}f</span>
      <div className="flex items-center w-12 h-2 rounded-sm overflow-hidden bg-muted">
        <div className="bg-green-600" style={{ width: `${insPct}%`, height: "100%" }} />
        <div className="bg-red-600 flex-1" style={{ height: "100%" }} />
      </div>
      <span className="text-green-600 tabular-nums">+{insertions}</span>
      <span className="text-red-600 tabular-nums">-{deletions}</span>
    </div>
  );
};
Component.displayName = "ChangesColumn";

export const changesColumn: ColumnDefinition = {
  id: "changes",
  label: "Changes",
  defaultWidth: 180,
  Component,
};

registerColumn(changesColumn);
