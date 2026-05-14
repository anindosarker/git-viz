import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useActionsStore } from "../../state/actionsStore";

export const TypedConfirmModal: React.FC = () => {
  const confirm = useActionsStore((s) => s.confirm);
  const closeConfirm = useActionsStore((s) => s.closeConfirm);
  const [text, setText] = React.useState("");
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText("");
  }, [confirm?.typedConfirm]);

  if (!confirm || !confirm.typedConfirm) return null;

  const matches = text === confirm.typedConfirm;

  const handleConfirm = async () => {
    if (!matches) return;
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

        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">
            Type <code className="px-1 py-0.5 bg-muted rounded">{confirm.typedConfirm}</code> to
            confirm:
          </label>
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches) void handleConfirm();
            }}
            placeholder={confirm.typedConfirm}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeConfirm} disabled={running}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!matches || running}>
            {running ? "Running…" : (confirm.confirmLabel ?? "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
