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

type Mode = "soft" | "mixed" | "hard";

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  soft: "Keep working tree and index. Just move HEAD.",
  mixed: "Reset index but keep working tree. (default)",
  hard: "Discard all changes since target commit. Destructive.",
};

export const ResetModal: React.FC = () => {
  const modal = useActionsStore((s) => s.modal);
  const closeModal = useActionsStore((s) => s.closeModal);
  const openConfirm = useActionsStore((s) => s.openConfirm);

  const [mode, setMode] = React.useState<Mode>("mixed");
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (modal?.kind === "reset") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode((modal.context?.mode as Mode) ?? "mixed");
    }
  }, [modal]);

  if (modal?.kind !== "reset") return null;
  const target = modal.context?.target as string;
  const short = target?.slice(0, 7) ?? "";

  const doReset = async () => {
    setRunning(true);
    try {
      await runAction(`Reset --${mode} ${short}`, () => gitActions.reset({ mode, target }));
    } finally {
      setRunning(false);
      closeModal();
    }
  };

  const submit = () => {
    if (mode === "hard") {
      openConfirm({
        title: "Hard reset",
        description: `This will permanently discard all uncommitted changes and move HEAD to ${short}. This cannot be undone.`,
        typedConfirm: "hard reset",
        confirmLabel: "Reset --hard",
        destructive: true,
        onConfirm: doReset,
      });
      return;
    }
    void doReset();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset to commit</DialogTitle>
          <DialogDescription>Target: {short}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(["soft", "mixed", "hard"] as Mode[]).map((m) => (
            <label key={m} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="reset-mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-1"
              />
              <span>
                <strong>--{m}</strong>
                <div className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[m]}</div>
              </span>
            </label>
          ))}
          <Input value={target ?? ""} disabled className="font-mono text-xs" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={running}>
            Cancel
          </Button>
          <Button
            variant={mode === "hard" ? "destructive" : "default"}
            onClick={submit}
            disabled={running}
          >
            {running ? "Resetting…" : `Reset --${mode}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
