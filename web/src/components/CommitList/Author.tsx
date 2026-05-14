import React, { useMemo } from "react";
import { useStore } from "../../state/store";
import { buildHighlightRegex, splitHighlight } from "../Search/highlight";
import { getInitials } from "../../utils/string";

interface AuthorProps {
  name: string;
  email: string;
}

export const Author: React.FC<AuthorProps> = ({ name, email }) => {
  const author = useStore((s) => s.author);
  const re = useMemo(() => buildHighlightRegex(author ?? "", false), [author]);
  const segments = splitHighlight(name, re);

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
        {getInitials(name)}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-xs font-medium truncate" title={`${name} <${email}>`}>
          {segments.map((seg, i) =>
            seg.match ? (
              <mark
                key={i}
                className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm px-0.5"
              >
                {seg.text}
              </mark>
            ) : (
              <React.Fragment key={i}>{seg.text}</React.Fragment>
            )
          )}
        </span>
      </div>
    </div>
  );
};
