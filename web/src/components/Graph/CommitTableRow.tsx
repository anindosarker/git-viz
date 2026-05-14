import { CommitContextMenu } from "@/components/CommitList/CommitContextMenu";
import { flexRender, type Row } from "@tanstack/react-table";
import type { Virtualizer, VirtualItem } from "@tanstack/react-virtual";
import type { GraphRow } from "@/graph";
import React from "react";
import { CommitTableCell } from "./CommitTableCell";

interface Props {
  row: Row<GraphRow>;
  virtualItem: VirtualItem;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  gridTemplate: string;
  isSelected: boolean;
  onSelect: (hash: string) => void;
}

const CommitTableRowImpl: React.FC<Props> = ({
  row,
  virtualItem,
  virtualizer,
  gridTemplate,
  isSelected,
  onSelect,
}) => {
  const commit = row.original.commit;
  const cells = row.getVisibleCells();
  const setRef = (node: HTMLDivElement | null) => {
    if (node) virtualizer.measureElement(node);
  };
  return (
    <CommitContextMenu commit={commit}>
      <div
        ref={setRef}
        data-index={virtualItem.index}
        data-selected={isSelected ? "true" : undefined}
        data-testid="commit-row"
        className="absolute left-0 right-0 cursor-pointer gitviz-row"
        style={{
          transform: `translateY(${virtualItem.start}px)`,
          display: "grid",
          gridTemplateColumns: gridTemplate,
          alignItems: "center",
        }}
        onClick={() => onSelect(commit.hash)}
      >
        {cells.map((cell) => {
          if (cell.column.id === "graph") {
            return <div key={cell.id} className="h-full" />;
          }
          return (
            <CommitTableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </CommitTableCell>
          );
        })}
      </div>
    </CommitContextMenu>
  );
};

export const CommitTableRow = React.memo(CommitTableRowImpl);
