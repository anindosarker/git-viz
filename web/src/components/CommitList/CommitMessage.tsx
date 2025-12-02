import React from "react";

interface CommitMessageProps {
  message: string;
}

export const CommitMessage: React.FC<CommitMessageProps> = ({ message }) => {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="truncate text-sm" title={message}>
        {message}
      </span>
    </div>
  );
};
