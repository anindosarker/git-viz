import type { GitRefPointer } from "@git-viz/shared";
import { RefBadge } from "@/components/Badges/RefBadge";
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

const Component: React.FC<ColumnRendererProps> = ({ row, context }) => {
  const refsInline = context?.refsInline === true;
  const refs = row.commit.refs ?? [];
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      {refsInline &&
        refs.map((ref, i) => (
          <RefBadge key={`${ref.type}:${ref.name}:${i}`} refName={refLabel(ref)} />
        ))}
      <span className="truncate text-sm" title={row.commit.subject}>
        {row.commit.subject}
      </span>
    </div>
  );
};
Component.displayName = "SubjectColumn";

export const subjectColumn: ColumnDefinition = {
  id: "subject",
  label: "Message",
  defaultWidth: "flex",
  Component,
};

registerColumn(subjectColumn);
