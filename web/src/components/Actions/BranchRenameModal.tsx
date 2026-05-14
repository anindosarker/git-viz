import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { runAction } from "./runAction";

export const BranchRenameModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const from = (modal?.context?.from as string) ?? "";
  const [to, setTo] = React.useState(from);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (modal?.kind === "branch-rename") setTo(from);
  }, [modal?.kind, from]);

  if (modal?.kind !== "branch-rename") return null;

  const submit = async () => {
    if (!to.trim() || to === from) return;
    setRunning(true);
    try {
      await runAction(`Rename ${from} → ${to}`, () =>
        gitActions.branchRename({ from, to: to.trim() })
      );
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename branch</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!to.trim() || to === from || running}>
            {running ? "Renaming…" : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
