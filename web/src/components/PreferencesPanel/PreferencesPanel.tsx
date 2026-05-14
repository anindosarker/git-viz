import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect } from "react";
import { setConfigKey } from "../../hooks/useConfigBridge";
import { useStore, type DateFormat, type RefDisplay } from "../../state/store";
import { Button } from "../ui/button";

const DEFAULT_COLUMNS = ["graph", "subject", "refs", "author", "date", "hash"];

export function PreferencesPanel() {
  const open = useStore((s) => s.preferencesOpen);
  const setOpen = useStore((s) => s.setPreferencesOpen);
  const columns = useStore((s) => s.columns);
  const setColumns = useStore((s) => s.setColumns);
  const refDisplay = useStore((s) => s.refDisplay);
  const setRefDisplay = useStore((s) => s.setRefDisplay);
  const dateFormat = useStore((s) => s.dateFormat);
  const setDateFormat = useStore((s) => s.setDateFormat);
  const showWorkingTree = useStore((s) => s.showWorkingTree);
  const setShowWorkingTree = useStore((s) => s.setShowWorkingTree);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const move = (index: number, delta: number) => {
    const next = columns.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setColumns(next);
    void setConfigKey("columns", next);
  };

  const updateRefDisplay = (v: RefDisplay) => {
    setRefDisplay(v);
    void setConfigKey("refDisplay", v);
  };
  const updateDateFormat = (v: DateFormat) => {
    setDateFormat(v);
    void setConfigKey("dateFormat", v);
  };
  const updateShowWorkingTree = (v: boolean) => {
    setShowWorkingTree(v);
    void setConfigKey("showWorkingTree", v);
  };
  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    void setConfigKey("columns", DEFAULT_COLUMNS);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Preferences"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-background text-foreground border rounded-md shadow-lg w-[480px] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-sm font-semibold">Preferences</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 py-3 space-y-4 text-sm">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Columns</h3>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={resetColumns}
              >
                Reset to defaults
              </button>
            </div>
            <ul className="border rounded divide-y">
              {columns.map((col, i) => (
                <li key={col} className="flex items-center justify-between px-2 py-1">
                  <span className="capitalize">{col}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="p-1 disabled:opacity-30"
                      aria-label={`Move ${col} up`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === columns.length - 1}
                      className="p-1 disabled:opacity-30"
                      aria-label={`Move ${col} down`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-medium mb-1">Ref display</h3>
            <select
              value={refDisplay}
              onChange={(e) => updateRefDisplay(e.target.value as RefDisplay)}
              className="border rounded px-2 py-1 bg-background w-full"
            >
              <option value="inline">Inline</option>
              <option value="left-column">Left column</option>
              <option value="right-column">Right column</option>
            </select>
          </section>

          <section>
            <h3 className="font-medium mb-1">Date format</h3>
            <select
              value={dateFormat}
              onChange={(e) => updateDateFormat(e.target.value as DateFormat)}
              className="border rounded px-2 py-1 bg-background w-full"
            >
              <option value="relative">Relative</option>
              <option value="absolute">Absolute</option>
              <option value="iso">ISO 8601</option>
            </select>
          </section>

          <section className="flex items-center justify-between">
            <label htmlFor="show-working-tree" className="font-medium">
              Show working tree row
            </label>
            <input
              id="show-working-tree"
              type="checkbox"
              checked={showWorkingTree}
              onChange={(e) => updateShowWorkingTree(e.target.checked)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
