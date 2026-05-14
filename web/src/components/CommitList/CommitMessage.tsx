import React, { useMemo } from "react";
import { buildHighlightRegex, splitHighlight } from "../Search/highlight";
import { useStore } from "../../state/store";

interface CommitMessageProps {
  message: string;
}

export const CommitMessage: React.FC<CommitMessageProps> = ({ message }) => {
  const query = useStore((s) => s.query);
  const queryRegex = useStore((s) => s.queryRegex);
  const re = useMemo(() => buildHighlightRegex(query, queryRegex), [query, queryRegex]);
  const segments = splitHighlight(message, re);

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="truncate text-sm" title={message}>
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
  );
};
