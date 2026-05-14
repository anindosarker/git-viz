import { Archive, Cloud, Disc, GitBranch, Tag } from "lucide-react";
import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { runAction } from "../Actions/runAction";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";

interface RefBadgeProps {
  refName: string;
}

export const RefBadge: React.FC<RefBadgeProps> = ({ refName }) => {
  // Parse ref type and name
  // Examples: "HEAD -> master", "origin/master", "tag: v1.0", "feature/foo"

  let type: "head" | "remote" | "tag" | "branch" | "stash" = "branch";
  let name = refName;
  let isHead = false;

  if (refName === "HEAD" || refName.startsWith("HEAD -> ")) {
    type = "head";
    name = refName === "HEAD" ? "HEAD" : refName.replace("HEAD -> ", "");
    isHead = true;
  } else if (refName.startsWith("tag: ")) {
    type = "tag";
    name = refName.replace("tag: ", "");
  } else if (refName.startsWith("stash@")) {
    type = "stash";
  } else if (refName.includes("/")) {
    type = "remote";
  }

  const getIcon = () => {
    const cls = "w-3 h-3 shrink-0";
    if (isHead) return <Disc key="head" className={cls} />;
    switch (type) {
      case "branch":
        return <GitBranch key="branch" className={cls} />;
      case "remote":
        return <Cloud key="remote" className={cls} />;
      case "tag":
        return <Tag key="tag" className={cls} />;
      case "stash":
        return <Archive key="stash" className={cls} />;
      default:
        return null;
    }
  };

  const getStyle = (): React.CSSProperties => {
    if (isHead) {
      return {
        backgroundColor: "var(--gitviz-badge-head-bg)",
        color: "var(--gitviz-badge-head-fg)",
        borderColor: "transparent",
      };
    }
    switch (type) {
      case "head":
      case "branch":
        return {
          backgroundColor: "var(--gitviz-badge-bg)",
          color: "var(--gitviz-badge-fg)",
          borderColor: "transparent",
        };
      case "remote":
        return {
          backgroundColor: "var(--gitviz-badge-remote-bg)",
          color: "var(--gitviz-badge-remote-fg)",
          borderColor: "transparent",
        };
      case "tag":
        return {
          backgroundColor: "var(--gitviz-badge-tag-bg)",
          color: "var(--gitviz-badge-tag-fg)",
          borderColor: "transparent",
        };
      case "stash":
        return {
          backgroundColor: "var(--gitviz-badge-bg)",
          color: "var(--gitviz-badge-fg)",
          borderColor: "transparent",
        };
      default:
        return {};
    }
  };

  const handleCopyBranchName = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
  };

  const badge = (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap cursor-context-menu font-mono leading-none"
      style={{ ...getStyle(), fontWeight: isHead ? 600 : 500 }}
    >
      {getIcon()}
      <span>{name}</span>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{badge}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {type === "branch" || type === "head" || type === "remote" ? (
          <>
            <ContextMenuItem
              inset
              onSelect={() => {
                void runAction(`Checkout ${name}`, () => gitActions.checkoutRef({ ref: name }));
              }}
            >
              Checkout
            </ContextMenuItem>
            <ContextMenuItem
              inset
              onSelect={() => {
                useActionsStore.getState().openModal({
                  kind: "branch-create",
                  context: { startPoint: name },
                });
              }}
            >
              Create branch from here…
            </ContextMenuItem>
            <ContextMenuItem
              inset
              onSelect={() => {
                useActionsStore.getState().openModal({
                  kind: "branch-rename",
                  context: { from: name },
                });
              }}
            >
              Rename…
            </ContextMenuItem>
            <ContextMenuItem
              inset
              onSelect={() => {
                useActionsStore.getState().openConfirm({
                  title: `Delete branch ${name}`,
                  description: `Delete local branch \`${name}\`?`,
                  confirmLabel: "Delete",
                  onConfirm: async () => {
                    await runAction(`Delete ${name}`, () => gitActions.branchDelete({ name }));
                  },
                });
              }}
            >
              Delete
            </ContextMenuItem>
            <ContextMenuItem
              inset
              className="text-destructive"
              onSelect={() => {
                useActionsStore.getState().openConfirm({
                  title: `Force-delete branch ${name}`,
                  description: `Branch may contain unmerged commits. This cannot be undone.`,
                  typedConfirm: name,
                  destructive: true,
                  confirmLabel: "Force delete",
                  onConfirm: async () => {
                    await runAction(`Force-delete ${name}`, () =>
                      gitActions.branchDelete({ name, force: true })
                    );
                  },
                });
              }}
            >
              Force delete…
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              inset
              onSelect={() => {
                useActionsStore.getState().openModal({
                  kind: "merge",
                  context: { ref: name },
                });
              }}
            >
              Merge into current
            </ContextMenuItem>
            <ContextMenuItem
              inset
              onSelect={() => {
                useActionsStore.getState().openModal({
                  kind: "rebase",
                  context: { onto: name },
                });
              }}
            >
              Rebase onto current
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : type === "tag" ? (
          <>
            <ContextMenuItem
              inset
              onSelect={() => {
                void runAction(`Checkout tag ${name}`, () => gitActions.checkoutRef({ ref: name }));
              }}
            >
              Checkout
            </ContextMenuItem>
            <ContextMenuItem
              inset
              className="text-destructive"
              onSelect={() => {
                useActionsStore.getState().openConfirm({
                  title: `Delete tag ${name}`,
                  description: `Permanently delete tag \`${name}\`? This cannot be undone.`,
                  typedConfirm: name,
                  destructive: true,
                  confirmLabel: "Delete tag",
                  onConfirm: async () => {
                    await runAction(`Delete tag ${name}`, () => gitActions.tagDelete({ name }));
                  },
                });
              }}
            >
              Delete tag…
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem inset onClick={handleCopyBranchName}>
          Copy Name
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
