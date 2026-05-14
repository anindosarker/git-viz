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
import { Input } from "../ui/input";
import { runAction } from "./runAction";

export const PushModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const openConfirm = useActionsStore((s) => s.openConfirm);
  const refs = useStore((s) => s.refs);

  const [remote, setRemote] = React.useState("origin");
  const [branch, setBranch] = React.useState("");
  const [force, setForce] = React.useState(false);
  const [tags, setTags] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (modal?.kind === "push") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBranch(refs?.head.branch ?? "");
      setRemote((modal.context?.remote as string) ?? "origin");
      setForce(false);
      setTags(false);
    }
  }, [modal, refs?.head.branch]);

  if (modal?.kind !== "push") return null;

  const doPush = async () => {
    setRunning(true);
    try {
      await runAction(`Push ${branch || ""} → ${remote}${force ? " (force-with-lease)" : ""}`, () =>
        gitActions.remotePush({
          branch: branch || undefined,
          remote,
          force,
          tags,
        })
      );
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  const submit = () => {
    if (force) {
      openConfirm({
        title: "Force push",
        description: `This will overwrite ${remote}/${branch || "current branch"} using --force-with-lease. Other collaborators may lose work.`,
        typedConfirm: branch || "force",
        confirmLabel: "Force push",
        destructive: true,
        onConfirm: doPush,
      });
      return;
    }
    void doPush();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Push</DialogTitle>
          <DialogDescription>Push commits to a remote.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="text-sm">
            Remote
            <Input value={remote} onChange={(e) => setRemote(e.target.value)} />
          </label>
          <label className="text-sm">
            Branch
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Force-with-lease (destructive)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tags} onChange={(e) => setTags(e.target.checked)} />
            Push tags
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button variant={force ? "destructive" : "default"} onClick={submit} disabled={running}>
            {running ? "Pushing…" : force ? "Force push…" : "Push"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
