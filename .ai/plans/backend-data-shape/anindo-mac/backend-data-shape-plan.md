# Plan 1 — Backend Git Data Shape

## Goal

Make backend output proper, complete, paged git data so frontend graph algorithms + renderers have everything they need. Foundation for plans 2–5.

## Non-goals

- Graph algorithm design (plan 3)
- Renderer / column choices (plan 3)
- Frontend refactor (plan 2)
- New write actions beyond what already exists (plan 5)

## Current state

- `shared/src/types.ts` — only `GitCommit { hash, parents, author, email, date, refs, message }`
- `backend/src/git/GitLogService.ts` — single `getLog(cwd)`, hardcoded `-n 1000`, custom line-based parser
- `backend/src/git/GitBranchService.ts` — action helpers only (checkout, merge, delete, create). No list.
- `backend/src/git/GitRepoService.ts` — repo name + current branch only.
- No tags, stashes, remotes, worktrees, HEAD state, signatures, stats, file changes endpoints.
- Refs are stuffed into `commit.refs` as raw strings — no structured branch/tag/HEAD info.

## Reference repos

Mine these during impl. Cloned to `.ai/reference/` (gitignored):

- `vscode-git-graph/src/dataSource.ts` — battle-tested git command wrapper, ref parsing, commit hydration
- `vscode-git-graph/src/types.ts` — type shape inspiration
- `vscode/extensions/git/src/git.ts` — official VSCode git wrapper
- `vscode/extensions/git/src/repository.ts` — state mgmt patterns

Do NOT copy-paste. Read, understand, write fresh code matching our types + structure.

## Decisions

- Loading: **lazy + paged**. Light list payload, details on demand.
- Output stays on existing IPC channels (`WebviewMessageHandler` for VS Code, `server.cjs` for standalone). No protocol rewrite this plan — just new message types.
- Shared types live in `shared/src/types.ts` (split into multiple files if it grows).
- Parser switches from line-state-machine to NUL-delimited records using `-z` + `--format` with `%x00` separators. Robust against newlines in commit messages.

## Type shape (target)

`shared/src/types.ts` ends up with:

```ts
export interface GitCommitSummary {
  hash: string;
  parents: string[];
  author: string;
  authorEmail: string;
  authorDate: string;      // ISO 8601
  committer: string;
  committerEmail: string;
  committerDate: string;
  subject: string;
  // refs NOT embedded — fetched separately via refs:getAll, merged client-side
}

export interface GitRefPointer {
  type: "branch" | "remote-branch" | "tag" | "head" | "stash";
  name: string;            // e.g. "main", "origin/main", "v1.0", "HEAD"
  commitHash: string;      // commit this ref points at
  isHead?: boolean;
}

export interface GitRefsSnapshot {
  head: GitHeadState;
  branches: GitBranch[];
  tags: GitTag[];
  stashes: GitStash[];
}

export interface GitCommitDetails {
  hash: string;
  body: string;            // full message minus subject
  signature: { status: "good" | "bad" | "untrusted" | "none"; signer?: string };
  stats: { files: number; insertions: number; deletions: number };
  // fileChanges fetched separately via commits:getFileChanges
}

export interface GitFileChange {
  path: string;
  oldPath?: string;        // for renames
  status: "A" | "M" | "D" | "R" | "C" | "T";
  insertions: number;
  deletions: number;
}

export interface GitBranch {
  name: string;
  tip: string;             // commit hash
  isHead: boolean;
  isRemote: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
  lastCommitDate: string;  // for tip-ordering in graph
}

export interface GitTag {
  name: string;
  target: string;          // commit hash
  annotated: boolean;
  message?: string;
  taggerDate?: string;
}

export interface GitStash {
  name: string;            // e.g. "stash@{0}"
  hash: string;
  message: string;
  date: string;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitHeadState {
  detached: boolean;
  branch?: string;         // when attached
  hash: string;
  shortHash: string;
}

export interface GitRepoInfo {
  name: string;
  root: string;
  head: GitHeadState;
  hasUncommittedChanges: boolean;
}
```

`GitCommit` (the legacy thin type) is renamed `GitCommitSummary`. Frontend extension (`web/src/types/git.ts`) updates accordingly in plan 2.

## Endpoints (message types)

All endpoints both sides — VS Code `WebviewMessageHandler` and standalone `server.cjs`.

| Endpoint                   | Request                                                            | Response                                                                |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `repo:getInfo`             | `{}`                                                               | `GitRepoInfo`                                                           |
| `commits:getPage`          | `{ cursor?: string, limit: number, refs?: string[] }`              | `{ commits: GitCommitSummary[], nextCursor?: string, hasMore: boolean }` |
| `commits:getDetails`       | `{ hash: string }`                                                 | `GitCommitDetails`                                                      |
| `commits:getFileChanges`   | `{ hash: string }`                                                 | `{ files: GitFileChange[], truncated: boolean }`                        |
| `refs:getAll`              | `{ includeRemote?: boolean }`                                      | `GitRefsSnapshot`                                                       |
| `remotes:list`             | `{}`                                                               | `GitRemote[]`                                                           |
| `bootstrap`                | `{ limit: number }`                                                | `{ repo: GitRepoInfo, refs: GitRefsSnapshot, firstPage: <commits:getPage response> }` |

Page default: `limit=500`. `cursor` = last hash of previous page (next page = `--skip` past cursor via `<cursor>~1` or via `--max-count` + `<cursor>^@`). Stable under concurrent writes since hash anchors position. First fetch uses `bootstrap` (one round trip, refs+commits+repo together). Subsequent scrolls use `commits:getPage`. Refs refetched on git write actions.

File changes split out: details view shows message + sig + stats immediately, file list streams in via `commits:getFileChanges`. Lets UI render details panel fast for huge commits.

Worktrees + submodules deferred (plan 5).

## Backend service changes

- `GitLogService` →
  - `getCommitsPage(cwd, cursor?, limit)` — `git log --all --format=...%x00 -z` + cursor anchoring (`<cursor>^@..` or rev-list with `--skip` past cursor). No embedded refs.
  - `getCommitDetails(cwd, hash)` — `git show --no-patch --format=...` for body + `git verify-commit --raw` for signature (lazy, only on details) + `git show --shortstat` for stats summary
  - `getFileChanges(cwd, hash)` — `git show --name-status --numstat` parsed into `GitFileChange[]`
  - NUL-delimited parser; tolerant of multiline subjects/bodies
- `GitBranchService` → add `list(cwd, includeRemote)` returning `GitBranch[]`. Uses `git for-each-ref refs/heads refs/remotes --format=...` + `git rev-list --left-right --count` for ahead/behind. Stays in this file.
- `GitTagService.list(cwd)` (new) → `git for-each-ref refs/tags --format=...`
- `GitStashService.list(cwd)` (new) → `git stash list --format=...`
- `GitRefService.getAll(cwd, includeRemote)` (new) — orchestrates branches + tags + stashes + head into `GitRefsSnapshot`. One call returns the whole picture.
- `GitRemoteService.list(cwd)` (new) → `git remote -v` parsed
- `GitRepoService.getRepoInfo` → returns full `GitRepoInfo` (HEAD state, dirty bit via `git status --porcelain` short-circuited with `--no-renames -uno`)
- `GitBootstrapService.get(cwd, limit)` (new, thin) — wraps `getRepoInfo` + `GitRefService.getAll` + `GitLogService.getCommitsPage(cursor=undefined, limit)` for the initial-load endpoint.

## Transport layer

- `src/panels/handlers/GitLogHandler.ts` → split into one handler per endpoint, OR keep one file with switch on message type. Existing pattern is one handler per concern — extend that.
- `server.cjs` (standalone) → mirror routes. Currently single file. May split into `server/routes/*.cjs` if it grows past ~200 lines.

Both transports share the same backend services (they already do). No business logic in handlers.

## Testing

- Unit-test parsers (NUL splitter, ref classifier, stat parser) — pure functions, no git needed. Vitest or node:test.
- Integration test against a fixture repo (small tarred-and-checked-in repo or generated at test setup with shell commands). Verify each endpoint returns expected shape.
- Visual verification via standalone `node server.cjs <path>` + browser — primary feedback loop. Spot-check against real repos (this repo, a big one).

## Ordering / sequencing

1. Define types in `shared/src/types.ts`. Build `shared`.
2. Rewrite `GitLogService` with NUL parser + paged `getCommitsPage` + `getCommitDetails`. Unit-test parser.
3. Add `GitBranchService.list`, `GitTagService`, `GitStashService`, `GitRemoteService`.
4. Update `GitRepoService.getRepoInfo` to return `GitRepoInfo`.
5. Wire all into `WebviewMessageHandler` + `server.cjs`. Add new message type names.
6. Smoke-test standalone server on 3 repos: tiny (<50 commits), medium (this repo), big (10k+).
7. Run `pnpm format` + `pnpm --filter backend type-check`.

Frontend in plan 2 picks up new shape. Frontend stays compiling during this plan by keeping old `GitCommit` as a type alias to `GitCommitSummary` plus a shim.

## Decided

- Pagination: commit-hash cursor (stable under concurrent writes).
- Signature: lazy, only in `commits:getDetails`.
- Refs: separate `refs:getAll` endpoint, bundled into `bootstrap` for cold start. Refetched on git write actions.
- File changes: separate `commits:getFileChanges` endpoint. Details endpoint stays light.

## Still open

- File changes cap for monster commits. Default cap 500 files, `truncated: true`. Confirm during impl.
- `refs:getAll` cost on huge repos (10k+ branches). Acceptable? Likely yes (`for-each-ref` is fast). Measure during step 6.

## Done when

- All endpoints return data matching shared types on tiny + medium + big fixture repos
- Parser tests pass
- Standalone server renders graph + clickable details with new endpoints (using current rolling algo, untouched)
- VS Code extension renders same data
- No regressions vs current behavior
