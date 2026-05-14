import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";

export function FilterMenu() {
  const open = useStore((s) => s.filterMenuOpen);
  const setOpen = useStore((s) => s.setFilterMenuOpen);
  const author = useStore((s) => s.author);
  const since = useStore((s) => s.since);
  const until = useStore((s) => s.until);
  const paths = useStore((s) => s.paths);
  const refScope = useStore((s) => s.refScope);
  const queryRegex = useStore((s) => s.queryRegex);
  const setAuthor = useStore((s) => s.setAuthor);
  const setSince = useStore((s) => s.setSince);
  const setUntil = useStore((s) => s.setUntil);
  const setPaths = useStore((s) => s.setPaths);
  const toggleRefScope = useStore((s) => s.toggleRefScope);
  const setQueryRegex = useStore((s) => s.setQueryRegex);
  const clearFilters = useStore((s) => s.clearFilters);

  const commits = useStore((s) => s.commits);
  const refs = useStore((s) => s.refs);

  const authorOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of commits) {
      if (!c.author || seen.has(c.author)) continue;
      seen.add(c.author);
      out.push(c.author);
      if (out.length >= 50) break;
    }
    return out;
  }, [commits]);

  const refOptions = useMemo(() => {
    const out: string[] = [];
    if (!refs) return out;
    for (const b of refs.branches) out.push(b.name);
    for (const t of refs.tags) out.push(t.name);
    return out;
  }, [refs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Filter commits"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-background text-foreground border rounded-md shadow-lg w-[520px] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-sm font-semibold">Filter commits</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close filter menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 py-3 space-y-4 text-sm">
          <section>
            <label className="block font-medium mb-1" htmlFor="filter-author">
              Author
            </label>
            <input
              id="filter-author"
              type="text"
              list="filter-author-options"
              value={author ?? ""}
              onChange={(e) => setAuthor(e.target.value || null)}
              className="border rounded px-2 py-1 bg-background w-full"
              placeholder="email or name substring"
            />
            <datalist id="filter-author-options">
              {authorOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1" htmlFor="filter-since">
                Since
              </label>
              <input
                id="filter-since"
                type="date"
                value={since ?? ""}
                onChange={(e) => setSince(e.target.value || null)}
                className="border rounded px-2 py-1 bg-background w-full"
              />
            </div>
            <div>
              <label className="block font-medium mb-1" htmlFor="filter-until">
                Until
              </label>
              <input
                id="filter-until"
                type="date"
                value={until ?? ""}
                onChange={(e) => setUntil(e.target.value || null)}
                className="border rounded px-2 py-1 bg-background w-full"
              />
            </div>
          </section>

          <section>
            <label className="block font-medium mb-1" htmlFor="filter-paths">
              Paths (one per line)
            </label>
            <textarea
              id="filter-paths"
              value={paths.join("\n")}
              onChange={(e) =>
                setPaths(
                  e.target.value
                    .split("\n")
                    .map((p) => p.trim())
                    .filter(Boolean)
                )
              }
              className="border rounded px-2 py-1 bg-background w-full h-20 font-mono text-xs"
              placeholder={"backend/\nweb/src/components/"}
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Refs</span>
              {refScope.length > 0 && (
                <button
                  type="button"
                  onClick={() => useStore.getState().setRefScope([])}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="border rounded max-h-40 overflow-auto">
              {refOptions.length === 0 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">No refs loaded</div>
              ) : (
                refOptions.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={refScope.includes(r)}
                      onChange={() => toggleRefScope(r)}
                    />
                    <span className="font-mono text-xs">{r}</span>
                  </label>
                ))
              )}
            </div>
          </section>

          <section className="flex items-center gap-2">
            <input
              id="filter-regex"
              type="checkbox"
              checked={queryRegex}
              onChange={(e) => setQueryRegex(e.target.checked)}
            />
            <label htmlFor="filter-regex" className="cursor-pointer">
              Use regex for free-text query
            </label>
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => clearFilters()}>
              Clear all
            </Button>
            <Button variant="default" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
