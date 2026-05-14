import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useActionsStore } from "../../state/actionsStore";
import { TypedConfirmModal } from "./TypedConfirmModal";

export const ConfirmModal: React.FC = () => {
  const confirm = useActionsStore((s) => s.confirm);
  const closeConfirm = useActionsStore((s) => s.closeConfirm);
  const [running, setRunning] = React.useState(false);

  if (!confirm) return null;

  // Delegate to the typed-confirm variant for destructive ops requiring typed input.
  if (confirm.typedConfirm) {
    return <TypedConfirmModal />;
  }

  const handleConfirm = async () => {
    setRunning(true);
    try {
      await confirm.onConfirm();
    } finally {
      setRunning(false);
      closeConfirm();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeConfirm()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirm.title}</DialogTitle>
          <DialogDescription>{confirm.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeConfirm} disabled={running}>
            Cancel
          </Button>
          <Button
            variant={confirm.destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={running}
          >
            {running ? "Running…" : (confirm.confirmLabel ?? "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
