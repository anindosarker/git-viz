import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const hash = row.commit.hash;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(hash);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-xs text-muted-foreground hover:text-foreground"
      title="Click to copy full hash"
    >
      {hash.substring(0, 7)}
    </button>
  );
};
Component.displayName = "HashColumn";

export const hashColumn: ColumnDefinition = {
  id: "hash",
  label: "Hash",
  defaultWidth: 80,
  Component,
};

registerColumn(hashColumn);
