import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gitService } from "../../services/git.service";
import { useStore } from "../../state/store";
import { Button } from "../ui/button";
import { HashJumpHint } from "./HashJumpHint";
import { isHashLike, parseSearch } from "./searchQuery";

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const setQuery = useStore((s) => s.setQuery);
  const setAuthor = useStore((s) => s.setAuthor);
  const setPaths = useStore((s) => s.setPaths);
  const setSince = useStore((s) => s.setSince);
  const setUntil = useStore((s) => s.setUntil);
  const setRefScope = useStore((s) => s.setRefScope);
  const setHash = useStore((s) => s.setHash);
  const select = useStore((s) => s.select);
  const appendPage = useStore((s) => s.appendPage);
  const resetCommits = useStore((s) => s.resetCommits);

  const [input, setInput] = useState<string>(() => {
    // Re-hydrate the displayed search string from persisted filter state.
    const s = useStore.getState();
    const parts: string[] = [];
    if (s.query) parts.push(s.query);
    if (s.author) parts.push(`author:${maybeQuote(s.author)}`);
    for (const p of s.paths) parts.push(`path:${maybeQuote(p)}`);
    if (s.since) parts.push(`since:${s.since}`);
    if (s.until) parts.push(`until:${s.until}`);
    for (const r of s.refScope) parts.push(`ref:${r}`);
    return parts.join(" ");
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (value: string) => {
    const parsed = parseSearch(value);
    setQuery(parsed.query);
    setAuthor(parsed.author ?? null);
    setPaths(parsed.paths);
    setSince(parsed.since ?? null);
    setUntil(parsed.until ?? null);
    setRefScope(parsed.refs);
    setHash(parsed.hash ?? null);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apply(input);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const trimmed = input.trim();
  const hashCandidate = isHashLike(trimmed) ? trimmed : null;

  const jumpToHash = async (hash: string) => {
    try {
      const commit = await gitService.getCommit(hash);
      if (!commit) return;
      const commits = useStore.getState().commits;
      const already = commits.find((c) => c.hash === commit.hash);
      if (already) {
        select(commit.hash);
        return;
      }
      // Not loaded yet — fetch a window via filter.hash.
      const page = await gitService.getCommitsPage({ filter: { hash: commit.hash } });
      resetCommits();
      appendPage(page);
      select(commit.hash);
    } catch {
      // ignore — bad hash
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
      apply("");
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      apply(input);
      if (hashCandidate) {
        void jumpToHash(hashCandidate);
      }
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      useStore.getState().setQueryRegex(!useStore.getState().queryRegex);
    }
  };

  return (
    <div className="relative flex items-center gap-1 w-72">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          data-gitviz="search"
          type="text"
          placeholder="Search commits…  (try author:foo path:bar)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full h-8 pl-7 pr-7 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Search commits"
        />
        {input && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setInput("");
              apply("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {hashCandidate && (
        <HashJumpHint hash={hashCandidate} onJump={() => void jumpToHash(hashCandidate)} />
      )}
    </div>
  );
}

function maybeQuote(s: string): string {
  return /\s/.test(s) ? `"${s}"` : s;
}
