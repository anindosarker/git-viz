import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "../../state/store";

export function RefFilter() {
  const refs = useStore((s) => s.refs);
  const refScope = useStore((s) => s.refScope);
  const toggleRefScope = useStore((s) => s.toggleRefScope);
  const setRefScope = useStore((s) => s.setRefScope);
  const open = useStore((s) => s.refPanelOpen);
  const setOpen = useStore((s) => s.setRefPanelOpen);

  const [branchesOpen, setBranchesOpen] = useState(true);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const { localBranches, remoteBranches, tags } = useMemo(() => {
    const localBranches: string[] = [];
    const remoteBranches: string[] = [];
    const tags: string[] = [];
    if (refs) {
      for (const b of refs.branches) {
        (b.isRemote ? remoteBranches : localBranches).push(b.name);
      }
      for (const t of refs.tags) tags.push(t.name);
    }
    return { localBranches, remoteBranches, tags };
  }, [refs]);

  if (!open) return null;

  return (
    <aside className="w-56 shrink-0 border-r overflow-y-auto text-sm bg-muted/10">
      <div className="px-2 py-1.5 border-b flex items-center justify-between">
        <span className="font-medium">Refs</span>
        {refScope.length > 0 && (
          <button
            type="button"
            onClick={() => setRefScope([])}
            className="text-xs text-muted-foreground hover:underline"
          >
            Clear ({refScope.length})
          </button>
        )}
      </div>
      <RefGroup
        title="Local branches"
        items={localBranches}
        open={branchesOpen}
        onToggle={() => setBranchesOpen((v) => !v)}
        checked={refScope}
        onToggleItem={toggleRefScope}
      />
      <RefGroup
        title="Remote branches"
        items={remoteBranches}
        open={remotesOpen}
        onToggle={() => setRemotesOpen((v) => !v)}
        checked={refScope}
        onToggleItem={toggleRefScope}
      />
      <RefGroup
        title="Tags"
        items={tags}
        open={tagsOpen}
        onToggle={() => setTagsOpen((v) => !v)}
        checked={refScope}
        onToggleItem={toggleRefScope}
      />
      <div className="px-2 py-2 border-t">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Hide panel
        </button>
      </div>
    </aside>
  );
}

interface RefGroupProps {
  title: string;
  items: string[];
  open: boolean;
  onToggle: () => void;
  checked: string[];
  onToggleItem: (name: string) => void;
}

function RefGroup({ title, items, open, onToggle, checked, onToggleItem }: RefGroupProps) {
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 w-full px-2 py-1 text-left hover:bg-muted/40 text-xs font-medium uppercase tracking-wide"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title} <span className="text-muted-foreground">({items.length})</span>
      </button>
      {open && (
        <div className="pl-2 pb-1">
          {items.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">none</div>
          ) : (
            items.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 px-2 py-0.5 cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={checked.includes(name)}
                  onChange={() => onToggleItem(name)}
                />
                <span className="font-mono text-xs truncate" title={name}>
                  {name}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
