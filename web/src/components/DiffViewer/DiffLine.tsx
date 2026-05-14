import React from "react";

interface DiffLineProps {
  kind: "context" | "add" | "del";
  text: string;
  oldLine?: number;
  newLine?: number;
}

const KIND_CLS = {
  context: "bg-transparent",
  add: "bg-green-500/10",
  del: "bg-red-500/10",
};

const SIGN = { context: " ", add: "+", del: "−" };

export const DiffLine: React.FC<DiffLineProps> = ({ kind, text, oldLine, newLine }) => {
  return (
    <div className={`flex font-mono text-xs leading-5 ${KIND_CLS[kind]}`}>
      <span className="w-10 px-2 text-right text-muted-foreground tabular-nums select-none shrink-0">
        {oldLine ?? ""}
      </span>
      <span className="w-10 px-2 text-right text-muted-foreground tabular-nums select-none shrink-0">
        {newLine ?? ""}
      </span>
      <span className="w-4 text-center select-none shrink-0">{SIGN[kind]}</span>
      <pre className="whitespace-pre-wrap break-all m-0">{text}</pre>
    </div>
  );
};
