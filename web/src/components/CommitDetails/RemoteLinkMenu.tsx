import type { GitRemote } from "@git-viz/shared";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import React from "react";
import { gitService } from "../../services/git.service";
import {
  commitUrlFor,
  hostLabel,
  parseRemoteUrl,
  type ParsedRemote,
} from "../../services/remoteUrl";
import { getVsCodeApi } from "../../services/vscodeApi";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface RemoteLinkMenuProps {
  hash: string;
}

interface RemoteOption {
  remoteName: string;
  parsed: ParsedRemote;
  url: string;
}

function buildOptions(remotes: GitRemote[], hash: string): RemoteOption[] {
  const options: RemoteOption[] = [];
  const seen = new Set<string>();
  for (const r of remotes) {
    const parsed = parseRemoteUrl(r.fetchUrl) ?? parseRemoteUrl(r.pushUrl);
    if (!parsed) continue;
    const url = commitUrlFor(parsed, hash);
    if (seen.has(url)) continue;
    seen.add(url);
    options.push({ remoteName: r.name, parsed, url });
  }
  return options;
}

function openUrl(url: string) {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage({ command: "external:openUrl", payload: { url } });
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const RemoteLinkMenu: React.FC<RemoteLinkMenuProps> = ({ hash }) => {
  const { data: remotes } = useQuery({
    queryKey: ["remotes"],
    queryFn: () => gitService.getRemotes(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const options = React.useMemo(() => buildOptions(remotes ?? [], hash), [remotes, hash]);

  if (options.length === 0) return null;

  if (options.length === 1) {
    const o = options[0];
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1"
        onClick={() => openUrl(o.url)}
        title={o.url}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="text-xs">Open on {hostLabel(o.parsed.host)}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="text-xs">Open on…</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Remotes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem key={o.url} onSelect={() => openUrl(o.url)}>
            <span className="truncate">
              {o.remoteName} ({hostLabel(o.parsed.host)})
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
