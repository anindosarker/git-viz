# Plan 5c — Search & Filter

## Goal

Discoverability. Users find commits by message/author/hash/date/file/ref. Filter the graph view to a subset.

## Non-goals

- Write actions (5d)
- Multi-repo (5e)
- AI-assisted natural language search (deferred)

## Decisions locked

- Search is **server-side** for free-text (delegates to `git log` flags). Client-only filters for refs/authors with already-loaded data.
- Search box in TopBar; filter chips below TopBar.
- Filters compose (AND). User can stack: `author:anindo` + `path:backend/` + `since:2024-01-01`.
- Search is paginated like normal commit list (Plan 1 cursor pagination, applied to filtered query).
- Results render in same graph view — not a separate results page. Graph algorithm recomputes over filtered set.

## Filter inputs

| Filter        | Backend?      | Notes                                                   |
| ------------- | ------------- | ------------------------------------------------------- |
| Subject/body  | `--grep=`     | Server-side. Regex toggle.                              |
| Author        | `--author=`   | Server-side. Email or name substring.                   |
| Hash          | direct lookup | Server-side. Short or full hash. Single-commit jump.    |
| Date range    | `--since=`, `--until=` | Server-side.                                |
| File path     | `-- <path>`   | Server-side. Glob support via `--`-pathspec.            |
| Ref scope     | `<ref>..HEAD` or `--branches=<glob>` | Server-side. Limits graph to ref subset. |
| Hide remotes  | client-side   | Toggle visibility of `refs/remotes/*`.                  |
| Hide tags     | client-side   | Toggle visibility of `refs/tags/*`.                     |

## Backend additions

Extend `commits:getPage` in Plan 1 with `filter`:

```ts
interface CommitFilter {
  query?: string;            // --grep=
  queryRegex?: boolean;
  author?: string;
  since?: string;            // ISO date
  until?: string;
  paths?: string[];          // -- <path>
  refs?: string[];           // limit to refs (passed to --branches= or rev list)
  hash?: string;             // direct lookup; bypasses cursor
}

// commits:getPage request shape becomes:
{ cursor?: string, limit: number, order?: 'topo' | 'date', filter?: CommitFilter }
```

Backend builds `git log` args from `filter`. Cursor pagination still works on filtered result.

For hash lookup: skip `getCommitsPage`, hit `commits:getCommit { hash }` → returns single commit. Frontend scrolls to it (loads surrounding pages if not visible).

New endpoint: `commits:getCommit { hash } → GitCommitSummary` for hash jumps.

## UI components

```
web/src/components/Search/
├── SearchBar.tsx           # main input in TopBar
├── FilterChips.tsx         # active filter pills below TopBar
├── FilterMenu.tsx          # dropdown with all filter inputs
├── AuthorFilter.tsx
├── DateRangeFilter.tsx
├── PathFilter.tsx
├── RefFilter.tsx           # toggle visibility of branches/tags/remotes
└── searchQuery.ts          # tokenizer: parse user input like `author:foo path:bar foo bar`
```

### SearchBar UX

Single input. Token syntax:

```
my search terms author:anindo path:backend/ since:2024-01-01 hash:1c25a3
```

Tokenizer parses qualifiers (`author:`, `path:`, `since:`, `until:`, `hash:`, `ref:`) and leaves free text as `query`. Renders as chips below input.

Hash detection: if user types only 7-40 hex chars, suggest "Jump to commit 1c25a3" inline.

### FilterMenu

Click filter icon next to SearchBar → modal with explicit inputs (date pickers, author dropdown sourced from loaded authors, multi-select ref tree). Power-user UI. Same query state.

### RefFilter

Sidebar-style ref tree in graph view (separate from Plan 5a's repo tree). Checkbox per ref. Toggling refs:

- Local-only client-side filter (just hide rows where commit is unreachable from checked refs): cheap but incorrect with merges
- Server-side rev-list with `--branches=<glob>` etc.: accurate, costs round trip

Use server-side. Affects `filter.refs` in `commits:getPage`.

## State

Zustand slice:

```ts
interface FilterSlice {
  query: string;                  // free-text
  queryRegex: boolean;
  author: string | null;
  since: string | null;
  until: string | null;
  paths: string[];
  hash: string | null;
  refScope: string[];             // ref names included; empty = all
  // computed:
  hasActiveFilters: boolean;
  apiFilter: CommitFilter;
}
```

Filter changes → invalidate commits cache → refetch first page.

## Keyboard

- `/` → focus search bar (Plan 5a binding)
- `Esc` in search → clear + blur
- `Enter` → execute (debounced auto-search anyway after 300ms)
- `Ctrl/Cmd + Enter` → toggle regex

## Hash jump flow

1. User types `1c25a3` (looks like hash).
2. Frontend: detect, show "↵ Jump to commit 1c25a3".
3. User hits Enter.
4. `commits:getCommit { hash }` → `GitCommitSummary` returned.
5. If already in loaded set: scroll to row + select.
6. If not: backend `commits:getPage` with `filter.hash` returns surrounding window (default ±50 commits). Load page, scroll, select.

## Highlight matches

Search results: subject + author rendered with `<mark>` around matches. Computed client-side via the same regex backend used. Performance: only highlight visible rows (virtualized).

## Sequencing

1. **5c-1**: Tokenizer `searchQuery.ts`. Unit-tested.
2. **5c-2**: `FilterSlice` + actions. Debounced trigger to refetch.
3. **5c-3**: Backend `commits:getPage` accepts `filter`. Updates `GitLogService` to build `git log` args.
4. **5c-4**: `SearchBar` + chip render. Wire to slice.
5. **5c-5**: `commits:getCommit` endpoint + hash jump flow.
6. **5c-6**: `FilterMenu` modal with explicit inputs (date pickers, author dropdown).
7. **5c-7**: `RefFilter` panel + server-side ref scope.
8. **5c-8**: Result highlighting in visible rows.
9. **5c-9**: Active filter chips dismiss button per chip.
10. **5c-10**: Persist last filter state in webview state.

## Risks

- `git log --grep` is slow on huge repos. Mitigate: rely on cursor pagination; show loading indicator; debounce input.
- Filter + topo order interactions can produce confusing graphs (lanes from missing commits). Document; consider showing a "filter active" badge with toggle to disable graph view.
- Author dropdown needs author list — derive from loaded pages, not full repo (expensive). "Type-to-filter" with seed from loaded commits is fine.
- Path filter with deep globs slow on big trees. Accept.

## Done when

- Typing in SearchBar filters graph
- `author:foo path:bar` syntax recognized, chips appear
- Date pickers narrow time range
- Hash jump scrolls + selects target commit
- Ref filter hides/shows branches
- All filters compose; clear-all button works
- Filter state survives reload
- Matches highlighted in visible rows
- Empty result state explains "no commits match"
