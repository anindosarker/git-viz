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

export const CherryPickModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const [annotate, setAnnotate] = React.useState(true);
  const [running, setRunning] = React.useState(false);

  if (modal?.kind !== "cherry-pick") return null;

  const hashes = (modal.context?.hashes as string[]) ?? [];

  const submit = async () => {
    if (hashes.length === 0) return;
    setRunning(true);
    try {
      await runAction(`Cherry-pick ${hashes.length} commit${hashes.length > 1 ? "s" : ""}`, () =>
        gitActions.cherryPick({ hashes, annotate })
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
          <DialogTitle>Cherry-pick</DialogTitle>
          <DialogDescription>{hashes.map((h) => h.slice(0, 7)).join(", ")}</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={annotate}
            onChange={(e) => setAnnotate(e.target.checked)}
          />
          Annotate with original commit (-x)
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={hashes.length === 0 || running}>
            {running ? "Cherry-picking…" : "Cherry-pick"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
