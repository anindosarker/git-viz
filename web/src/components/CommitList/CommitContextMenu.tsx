import type { CommitRow } from "@/types/git";
import type { GitRemote } from "@git-viz/shared";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { gitService } from "../../services/git.service";
import {
  commitUrlFor,
  hostLabel,
  parseRemoteUrl,
  type ParsedRemote,
} from "../../services/remoteUrl";
import { getVsCodeApi } from "../../services/vscodeApi";
import { useStore } from "../../state/store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../ui/context-menu";

interface CommitContextMenuProps {
  commit: CommitRow;
  children: React.ReactNode;
}

interface RemoteOption {
  remoteName: string;
  parsed: ParsedRemote;
  url: string;
}

function buildOptions(remotes: GitRemote[], hash: string): RemoteOption[] {
  const out: RemoteOption[] = [];
  const seen = new Set<string>();
  for (const r of remotes) {
    const parsed = parseRemoteUrl(r.fetchUrl) ?? parseRemoteUrl(r.pushUrl);
    if (!parsed) continue;
    const url = commitUrlFor(parsed, hash);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ remoteName: r.name, parsed, url });
  }
  return out;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignored
  }
}

function openUrl(url: string) {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage({ command: "external:openUrl", payload: { url } });
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const CommitContextMenu: React.FC<CommitContextMenuProps> = ({ commit, children }) => {
  const select = useStore((s) => s.select);
  const openDiffViewer = useStore((s) => s.openDiffViewer);

  const { data: remotes } = useQuery({
    queryKey: ["remotes"],
    queryFn: () => gitService.getRemotes(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const remoteOptions = React.useMemo(
    () => buildOptions(remotes ?? [], commit.hash),
    [remotes, commit.hash]
  );

  const onCopyBody = async () => {
    try {
      const details = await gitService.getCommitDetails(commit.hash);
      await copy(details.body || commit.subject);
    } catch {
      await copy(commit.subject);
    }
  };

  const onViewDiff = async () => {
    select(commit.hash);
    try {
      const { files } = await gitService.getFileChanges(commit.hash);
      if (files.length > 0) {
        const api = getVsCodeApi();
        if (api) {
          api.postMessage({
            command: "diff:openFile",
            payload: {
              hash: commit.hash,
              path: files[0].path,
              oldPath: files[0].oldPath,
              status: files[0].status,
            },
          });
        } else {
          openDiffViewer(commit.hash, files[0].path);
        }
      }
    } catch {
      // ignored
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem inset onSelect={() => copy(commit.hash)}>
          Copy SHA
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={() => copy(commit.subject)}>
          Copy Subject
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={() => copy(commit.author)}>
          Copy Author
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={onCopyBody}>
          Copy Body
        </ContextMenuItem>
        {remoteOptions.length > 0 && (
          <>
            <ContextMenuSeparator />
            {remoteOptions.length === 1 ? (
              <ContextMenuItem inset onSelect={() => openUrl(remoteOptions[0].url)}>
                Open on {hostLabel(remoteOptions[0].parsed.host)}
              </ContextMenuItem>
            ) : (
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Open on…</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {remoteOptions.map((o) => (
                    <ContextMenuItem key={o.url} onSelect={() => openUrl(o.url)}>
                      {o.remoteName} ({hostLabel(o.parsed.host)})
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem inset onSelect={() => select(commit.hash)}>
          View Files
        </ContextMenuItem>
        <ContextMenuItem inset onSelect={onViewDiff}>
          View Diff
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
