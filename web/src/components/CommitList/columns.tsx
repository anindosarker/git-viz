import type { GitCommit } from "@/types/git";
import { createColumnHelper } from "@tanstack/react-table";
import { RefBadge } from "../Badges/RefBadge";
import { Author } from "./Author";
import { CommitMessage } from "./CommitMessage";

const columnHelper = createColumnHelper<GitCommit>();

export const columns = [
  columnHelper.accessor("refs", {
    header: "Branches",
    cell: (info) => {
      const refs = info.getValue() || [];
      if (refs.length === 0) return null;

      const firstRef = refs[0];
      const count = refs.length;

      return (
        <div
          className="flex items-center gap-1 h-full overflow-hidden"
          title={refs.join("\n")}
        >
          <RefBadge refName={firstRef} />
          {count > 1 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded-sm border">
              +{count - 1}
            </span>
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
