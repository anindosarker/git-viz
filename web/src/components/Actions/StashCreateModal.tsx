import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { runAction } from "./runAction";

export const StashCreateModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);

  const [message, setMessage] = React.useState("");
  const [includeUntracked, setIncludeUntracked] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  if (modal?.kind !== "stash-create") return null;

  const submit = async () => {
    setRunning(true);
    try {
      await runAction("Stash changes", () =>
        gitActions.stashCreate({
          message: message.trim() || undefined,
          includeUntracked,
        })
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
          <DialogTitle>Stash changes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="Optional stash message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeUntracked}
              onChange={(e) => setIncludeUntracked(e.target.checked)}
            />
            Include untracked files
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={running}>
            {running ? "Stashing…" : "Stash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
