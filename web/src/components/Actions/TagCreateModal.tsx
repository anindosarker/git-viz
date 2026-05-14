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
import { Input } from "../ui/input";
import { runAction } from "./runAction";

export const TagCreateModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);

  const [name, setName] = React.useState("");
  const [annotated, setAnnotated] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (modal?.kind === "tag-create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setMessage("");
    }
  }, [modal?.kind]);

  if (modal?.kind !== "tag-create") return null;

  const target = modal.context?.target as string | undefined;

  const submit = async () => {
    if (!name.trim()) return;
    setRunning(true);
    try {
      await runAction(`Tag ${name}`, () =>
        gitActions.tagCreate({
          name: name.trim(),
          target,
          annotated,
          message: annotated ? message || name.trim() : undefined,
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
          <DialogTitle>Create tag</DialogTitle>
          {target && <DialogDescription>At {target.slice(0, 7)}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="v1.0.0"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={annotated}
              onChange={(e) => setAnnotated(e.target.checked)}
            />
            Annotated tag
          </label>
          {annotated && (
            <Input
              placeholder="Tag message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || running}>
            {running ? "Creating…" : "Create tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
