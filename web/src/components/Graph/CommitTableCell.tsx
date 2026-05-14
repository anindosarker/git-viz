import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export const CommitTableCell: React.FC<Props> = ({ children, className }) => {
  return <div className={cn("px-2 overflow-hidden text-sm", className)}>{children}</div>;
};
