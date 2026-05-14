import { Check, Cloud, Laptop, Tag } from "lucide-react";
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

  let type: "head" | "remote" | "tag" | "branch" = "branch";
  let name = refName;
  let isHead = false;

  if (refName === "HEAD" || refName.startsWith("HEAD -> ")) {
    type = "head";
    name = refName === "HEAD" ? "HEAD" : refName.replace("HEAD -> ", "");
    isHead = true;
  } else if (refName.startsWith("tag: ")) {
    type = "tag";
    name = refName.replace("tag: ", "");
  } else if (refName.includes("/")) {
    type = "remote";
  }

  const getIcons = () => {
    const icons = [];
    if (isHead) {
      icons.push(<Check key="check" className="w-3 h-3 mr-1" />);
    }

    switch (type) {
      case "head":
      case "branch":
        icons.push(<Laptop key="laptop" className="w-3 h-3 mr-1" />);
        break;
      case "remote":
        icons.push(<Cloud key="cloud" className="w-3 h-3 mr-1" />);
        break;
      case "tag":
        icons.push(<Tag key="tag" className="w-3 h-3 mr-1" />);
        break;
    }
    return icons;
  };

  // Custom colors to match GitLens style
  const getStyle = () => {
    switch (type) {
      case "head":
      case "branch":
        // Greenish/Teal for local branches
        return {
          backgroundColor: "rgba(20, 80, 70, 0.9)",
          color: "#4db6ac",
          borderColor: "#26a69a",
          borderWidth: "1px",
        };
      case "remote":
        // Blue for remote branches
        return {
          backgroundColor: "rgba(20, 60, 100, 0.9)",
          color: "#64b5f6",
          borderColor: "#42a5f5",
          borderWidth: "1px",
        };
      case "tag":
        // Yellow/Brown for tags
        return {
          backgroundColor: "rgba(80, 70, 20, 0.9)",
          color: "#ffd54f",
          borderColor: "#ffca28",
          borderWidth: "1px",
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
      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border whitespace-nowrap cursor-context-menu"
      style={getStyle()}
    >
      {getIcons()}
      {name}
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
