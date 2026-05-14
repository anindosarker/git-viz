import type { CommitFilter } from "@git-viz/shared";

export interface ParsedSearch {
  query: string;
  author?: string;
  paths: string[];
  since?: string;
  until?: string;
  hash?: string;
  refs: string[];
}

const QUALIFIERS = ["author", "path", "since", "until", "hash", "ref"] as const;
type Qualifier = (typeof QUALIFIERS)[number];

const QUALIFIER_SET = new Set<string>(QUALIFIERS);

const HEX_RE = /^[0-9a-f]{7,40}$/i;

export function isHashLike(s: string): boolean {
  return HEX_RE.test(s);
}

interface Token {
  qualifier?: Qualifier;
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    while (i < len && input[i] === " ") i++;
    if (i >= len) break;

    let buf = "";
    let inQuote: '"' | "'" | null = null;
    while (i < len) {
      const ch = input[i];
      if (inQuote) {
        if (ch === inQuote) {
          inQuote = null;
          i++;
          continue;
        }
        buf += ch;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inQuote = ch;
        i++;
        continue;
      }
      if (ch === " ") break;
      buf += ch;
      i++;
    }

    if (buf.length === 0) continue;

    const colon = buf.indexOf(":");
    if (colon > 0) {
      const head = buf.slice(0, colon).toLowerCase();
      if (QUALIFIER_SET.has(head)) {
        const rest = buf.slice(colon + 1);
        tokens.push({ qualifier: head as Qualifier, value: rest });
        continue;
      }
    }
    tokens.push({ value: buf });
  }
  return tokens;
}

export function parseSearch(input: string): ParsedSearch {
  const tokens = tokenize(input.trim());
  const free: string[] = [];
  const paths: string[] = [];
  const refs: string[] = [];
  let author: string | undefined;
  let since: string | undefined;
  let until: string | undefined;
  let hash: string | undefined;

  for (const t of tokens) {
    if (!t.qualifier) {
      free.push(t.value);
      continue;
    }
    if (t.value.length === 0) continue;
    switch (t.qualifier) {
      case "author":
        author = t.value;
        break;
      case "path":
        paths.push(t.value);
        break;
      case "since":
        since = t.value;
        break;
      case "until":
        until = t.value;
        break;
      case "hash":
        hash = t.value;
        break;
      case "ref":
        refs.push(t.value);
        break;
    }
  }

  const query = free.join(" ");
  if (!hash && free.length === 1 && isHashLike(free[0])) {
    // free-text that looks like a hash is suggested as a hash jump, but
    // we still keep it as a query so server-side --grep can find it if not.
  }

  return { query, author, paths, since, until, hash, refs };
}

export function toCommitFilter(parsed: ParsedSearch, queryRegex: boolean): CommitFilter {
  const filter: CommitFilter = {};
  if (parsed.query) {
    filter.query = parsed.query;
    if (queryRegex) filter.queryRegex = true;
  }
  if (parsed.author) filter.author = parsed.author;
  if (parsed.since) filter.since = parsed.since;
  if (parsed.until) filter.until = parsed.until;
  if (parsed.paths.length > 0) filter.paths = parsed.paths;
  if (parsed.refs.length > 0) filter.refs = parsed.refs;
  if (parsed.hash) filter.hash = parsed.hash;
  return filter;
}

export function hasAnyFilter(parsed: ParsedSearch): boolean {
  return Boolean(
    parsed.query ||
    parsed.author ||
    parsed.since ||
    parsed.until ||
    parsed.hash ||
    parsed.paths.length > 0 ||
    parsed.refs.length > 0
  );
}
