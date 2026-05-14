import type { GitCommitSummary } from "@git-viz/shared";
import { Copy } from "lucide-react";
import React from "react";
import { gitService } from "../../services/git.service";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface CopyMenuProps {
  commit: GitCommitSummary;
  body?: string;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignored — best-effort
  }
}

export const CopyMenu: React.FC<CopyMenuProps> = ({ commit, body }) => {
  const onCopyPatch = async () => {
    try {
      const patch = await gitService.getPatch(commit.hash);
      await copy(patch);
    } catch {
      // ignored
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1" aria-label="Copy">
          <Copy className="h-3.5 w-3.5" />
          <span className="text-xs">Copy</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => copy(commit.hash)}>Copy SHA (full)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(commit.hash.slice(0, 7))}>
          Copy SHA (short)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => copy(commit.subject)}>Copy Subject</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(commit.author)}>Copy Author</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(commit.authorEmail)}>
          Copy Author Email
        </DropdownMenuItem>
        {body && body.trim() && (
          <DropdownMenuItem onSelect={() => copy(body)}>Copy Commit Body</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCopyPatch}>Copy Patch</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
