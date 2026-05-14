import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
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

export const RevertModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const [edit, setEdit] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  if (modal?.kind !== "revert") return null;
  const hash = modal.context?.hash as string;

  const submit = async () => {
    setRunning(true);
    try {
      await runAction(`Revert ${hash.slice(0, 7)}`, () => gitActions.revert({ hash, edit }));
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revert commit</DialogTitle>
          <DialogDescription>
            Creates a new commit that undoes <code>{hash?.slice(0, 7)}</code>.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} />
          Edit commit message
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={running}>
            {running ? "Reverting…" : "Revert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
