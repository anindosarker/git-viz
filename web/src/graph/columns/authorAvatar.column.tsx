import { getInitials } from "@/utils/string";
import { registerColumn } from "./registry";
import type { ColumnDefinition, ColumnRendererProps } from "./types";

const Component: React.FC<ColumnRendererProps> = ({ row }) => {
  const { author, authorAvatar } = row.commit;
  return (
    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
      {authorAvatar ? (
        <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
      ) : (
        getInitials(author)
      )}
    </div>
  );
};
Component.displayName = "AuthorAvatarColumn";

export const authorAvatarColumn: ColumnDefinition = {
  id: "authorAvatar",
  label: "",
  defaultWidth: 36,
  Component,
};

registerColumn(authorAvatarColumn);
