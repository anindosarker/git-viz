import { CommitTooltipCard } from "@/components/CommitList/CommitTooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const hash = row.commit.hash;
  const isMerge = row.commit.parents.length >= 2;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(hash);
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`font-mono text-xs text-muted-foreground hover:text-foreground ${
            isMerge ? "gitviz-merge-commit" : ""
          }`}
          title="Click to copy full hash"
        >
          {hash.substring(0, 7)}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="end">
        <CommitTooltipCard commit={row.commit} />
      </TooltipContent>
    </Tooltip>
  );
};
Component.displayName = "HashColumn";

export const hashColumn: ColumnDefinition = {
  id: "hash",
  label: "Hash",
  defaultWidth: 80,
  Component,
  sortable: true,
};

registerColumn(hashColumn);
