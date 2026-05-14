import { CommitTooltipCard } from "@/components/CommitList/CommitTooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from "@/utils/string";
import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const { author, authorEmail, authorAvatar } = row.commit;
  const isMerge = row.commit.parents.length >= 2;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-2 overflow-hidden ${
            isMerge ? "gitviz-merge-commit" : ""
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
            {authorAvatar ? (
              <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
            ) : (
              getInitials(author)
            )}
          </div>
          <span className="text-xs font-medium truncate" title={`${author} <${authorEmail}>`}>
            {author}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        <CommitTooltipCard commit={row.commit} />
      </TooltipContent>
    </Tooltip>
  );
};
Component.displayName = "AuthorColumn";

export const authorColumn: ColumnDefinition = {
  id: "author",
  label: "Author",
  defaultWidth: 200,
  Component,
  sortable: true,
};

registerColumn(authorColumn);
