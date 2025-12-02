import type { GitCommit } from "@/types/git";
import { createColumnHelper } from "@tanstack/react-table";
import { RefBadge } from "../Badges/RefBadge";
import { Author } from "./Author";
import { CommitMessage } from "./CommitMessage";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const columnHelper = createColumnHelper<GitCommit>();

export const columns = [
  columnHelper.accessor("refs", {
    header: "Branches",
    cell: (info) => {
      const refs = info.getValue() || [];
      if (refs.length === 0) return null;

      const firstRef = refs[0];
      const count = refs.length;
      const hiddenRefs = refs.slice(1);

      return (
        <div className="flex items-center gap-1 h-full overflow-hidden">
          <RefBadge refName={firstRef} />
          {count > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded-sm border cursor-default">
                    +{count - 1}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="p-1 bg-popover border-border">
                  <div className="flex flex-col gap-1">
                    {hiddenRefs.map((ref, i) => (
                      <RefBadge key={i} refName={ref} />
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
    size: 200, // Fixed width for alignment
  }),
  columnHelper.display({
    id: "graph",
    header: "Graph",
    cell: () => null, // Placeholder, content rendered via overlay
    size: 150, // Initial size, will be overridden
  }),
  columnHelper.accessor("hash", {
    header: "Hash",
    cell: (info) => (
      <span className="font-mono text-xs">
        {info.getValue().substring(0, 7)}
      </span>
    ),
    size: 80,
  }),
  columnHelper.accessor("message", {
    header: "Message",
    cell: (info) => <CommitMessage message={info.getValue()} />,
    // Size is flexible
  }),
  columnHelper.accessor("author", {
    header: "Author",
    cell: (info) => (
      <Author name={info.getValue()} email={info.row.original.email} />
    ),
    size: 200,
  }),
  columnHelper.accessor("date", {
    header: () => <div className="text-right">Date</div>,
    cell: (info) => (
      <div className="text-right text-xs text-muted-foreground">
        {new Date(info.getValue()).toLocaleString()}
      </div>
    ),
    size: 150,
  }),
];
