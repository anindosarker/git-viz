import { Copy, X } from "lucide-react";
import React from "react";
import { gitErrorHint } from "../../lib/gitErrors";
import { useActionsStore } from "../../state/actionsStore";
import { Button } from "../ui/button";

export const ActionResultToast: React.FC = () => {
  const toasts = useActionsStore((s) => s.toasts);
  const dismiss = useActionsStore((s) => s.dismissToast);

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const successIds = toasts.filter((t) => t.ok).map((t) => t.id);
    if (successIds.length === 0) return;
    const handle = window.setTimeout(() => {
      for (const id of successIds) dismiss(id);
    }, 3500);
    return () => window.clearTimeout(handle);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((t) => {
        const hint = !t.ok ? gitErrorHint(t.result.stderr) : undefined;
        const message = t.ok
          ? t.result.stdout.trim() || "Done."
          : t.result.stderr || `git exited with code ${t.result.exitCode}`;
        return (
          <div
            key={t.id}
            className={`rounded-md border shadow-md p-3 text-sm ${
              t.ok ? "bg-background" : "bg-destructive/10 border-destructive/50"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {t.ok ? "✓ " : "✗ "}
                  {t.title}
                </div>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground max-h-32 overflow-y-auto font-mono">
                  {message}
                </pre>
                {hint && (
                  <div className="mt-2 text-xs text-foreground">
                    <strong>Hint:</strong> {hint}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {!t.ok && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(t.result.stderr);
                    }}
                    title="Copy stderr"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => dismiss(t.id)}
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
