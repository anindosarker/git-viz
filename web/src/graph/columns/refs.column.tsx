import type { GitRefPointer } from "@git-viz/shared";
import { RefBadge } from "@/components/Badges/RefBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

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

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const refs = row.commit.refs ?? [];
  if (refs.length === 0) return null;

  const first = refs[0];
  const rest = refs.slice(1);

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <RefBadge refName={refLabel(first)} />
      {rest.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded-sm border cursor-default">
                +{rest.length}
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-1 bg-popover border-border">
              <div className="flex flex-col gap-1">
                {rest.map((ref, i) => (
                  <RefBadge key={i} refName={refLabel(ref)} />
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
Component.displayName = "RefsColumn";

export const refsColumn: ColumnDefinition = {
  id: "refs",
  label: "Refs",
  defaultWidth: 200,
  Component,
};

registerColumn(refsColumn);
