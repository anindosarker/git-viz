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

export const BranchCreateModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const [name, setName] = React.useState("");
  const [checkout, setCheckout] = React.useState(true);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (modal?.kind === "branch-create") setName("");
  }, [modal?.kind]);

  if (modal?.kind !== "branch-create") return null;

  const startPoint = modal.context?.startPoint as string | undefined;

  const submit = async () => {
    if (!name.trim()) return;
    setRunning(true);
    try {
      await runAction(`Create branch ${name}`, () =>
        gitActions.branchCreate({ name: name.trim(), startPoint, checkout })
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
          <DialogTitle>Create branch</DialogTitle>
          {startPoint && (
            <DialogDescription>
              From <code className="px-1 bg-muted rounded">{startPoint.slice(0, 7)}</code>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="feature/my-branch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checkout}
              onChange={(e) => setCheckout(e.target.checked)}
            />
            Checkout after create
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || running}>
            {running ? "Creating…" : "Create branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
