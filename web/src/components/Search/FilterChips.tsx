import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStore } from "../../state/store";

interface Chip {
  key: string;
  label: string;
  onClear: () => void;
}

export function FilterChips() {
  const author = useStore((s) => s.author);
  const since = useStore((s) => s.since);
  const until = useStore((s) => s.until);
  const paths = useStore((s) => s.paths);
  const refScope = useStore((s) => s.refScope);
  const query = useStore((s) => s.query);
  const queryRegex = useStore((s) => s.queryRegex);
  const setAuthor = useStore((s) => s.setAuthor);
  const setSince = useStore((s) => s.setSince);
  const setUntil = useStore((s) => s.setUntil);
  const setPaths = useStore((s) => s.setPaths);
  const setRefScope = useStore((s) => s.setRefScope);
  const setQuery = useStore((s) => s.setQuery);
  const setQueryRegex = useStore((s) => s.setQueryRegex);
  const clearFilters = useStore((s) => s.clearFilters);

  const chips: Chip[] = [];
  if (query) {
    chips.push({
      key: "query",
      label: `query: ${query}${queryRegex ? " (regex)" : ""}`,
      onClear: () => setQuery(""),
    });
  }
  if (author) {
    chips.push({ key: "author", label: `author: ${author}`, onClear: () => setAuthor(null) });
  }
  if (since) {
    chips.push({ key: "since", label: `since: ${since}`, onClear: () => setSince(null) });
  }
  if (until) {
    chips.push({ key: "until", label: `until: ${until}`, onClear: () => setUntil(null) });
  }
  for (const p of paths) {
    chips.push({
      key: `path:${p}`,
      label: `path: ${p}`,
      onClear: () => setPaths(paths.filter((x) => x !== p)),
    });
  }
  for (const r of refScope) {
    chips.push({
      key: `ref:${r}`,
      label: `ref: ${r}`,
      onClear: () => setRefScope(refScope.filter((x) => x !== r)),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap py-1 px-2 border-b bg-muted/20 text-xs">
      <span className="text-muted-foreground mr-1">Filters:</span>
      <AnimatePresence initial={false}>
        {chips.map((c) => (
          <motion.span
            key={c.key}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: -8, transition: { duration: 0.1, ease: "easeIn" } }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 border"
          >
            {c.label}
            <button
              type="button"
              onClick={c.onClear}
              className="hover:text-destructive"
              aria-label={`Remove filter ${c.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => {
          clearFilters();
          setQueryRegex(false);
        }}
        className="ml-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
