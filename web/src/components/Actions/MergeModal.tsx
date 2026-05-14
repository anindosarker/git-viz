import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { runAction } from "./runAction";

export const MergeModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const refs = useStore((s) => s.refs);
  const headBranch = refs?.head.branch;

  const [selected, setSelected] = React.useState<string>("");
  const [noFF, setNoFF] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (modal?.kind === "merge") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected((modal.context?.ref as string) ?? "");
    }
  }, [modal]);

  if (modal?.kind !== "merge") return null;

  const branches = (refs?.branches ?? []).filter((b) => !b.isRemote && b.name !== headBranch);

  const submit = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      await runAction(`Merge ${selected}`, () => gitActions.merge({ ref: selected, noFF }));
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge into {headBranch ?? "current"}</DialogTitle>
          <DialogDescription>Choose a branch to merge in.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <select
            className="border rounded-md h-9 px-2 text-sm bg-transparent"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={noFF} onChange={(e) => setNoFF(e.target.checked)} />
            Always create a merge commit (--no-ff)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || running}>
            {running ? "Merging…" : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
