import React from "react";
import { gitActions } from "../../services/git-actions.service";
import { useActionsStore } from "../../state/actionsStore";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { runAction } from "./runAction";

export const RebaseModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const refs = useStore((s) => s.refs);
  const [selected, setSelected] = React.useState<string>("");
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (modal?.kind === "rebase") setSelected((modal.context?.onto as string) ?? "");
  }, [modal]);

  if (modal?.kind !== "rebase") return null;

  const branches = (refs?.branches ?? []).filter((b) => !b.isRemote);

  const submit = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      await runAction(`Rebase onto ${selected}`, () => gitActions.rebase({ onto: selected }));
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rebase</DialogTitle>
        </DialogHeader>
        <select
          className="border rounded-md h-9 px-2 text-sm bg-transparent"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Rebase onto…</option>
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || running}>
            {running ? "Rebasing…" : "Rebase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
