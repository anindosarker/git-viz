# Plan 5b — Commit Details + Diff

## Goal

Build commit details panel and file diff viewer. Primary commit interaction surface.

## Non-goals

- Search/filter (5c)
- Write actions / context-menu mutations (5d)
- Multi-repo (5e)
- Backend endpoints — already defined in Plan 1 (`commits:getDetails`, `commits:getFileChanges`)

## Decisions locked

- Details panel = bottom drawer in webview (slides up from selected row, like git-graph extension)
- File diff: VS Code mode uses native diff editor (`vscode.diff` command); standalone mode uses inline custom diff viewer
- Markdown rendering for commit body via `marked` + sanitize
- Copy actions via clipboard API
- Remote URL inference from `remotes:list` (Plan 1) — supports github/gitlab/bitbucket

## UI shape

Drawer below table when commit selected:

```
┌─────────────────────────────────────────────────────────────────┐
│ 76dd... feat: refactor backend       Anindo Sarker   2h ago    ✕│
│ ┌─ Author ─┬─ Committer ─┬─ Signature ─┬─ Refs ───────────────┐ │
│ │ Anindo   │ Anindo      │ ✓ Verified  │ master  origin/master│ │
│ └──────────┴─────────────┴─────────────┴──────────────────────┘ │
│                                                                 │
│ Full commit message body (markdown rendered)…                   │
│                                                                 │
│ ┌─ Files changed (6) ─ +120 −45 ──── [Copy] [Open on GitHub] ──┐│
│ │ M  backend/src/git/GitLogService.ts        +30 −15           ││
│ │ M  shared/src/types.ts                     +50  −5           ││
│ │ A  backend/src/git/GitTagService.ts        +40  −0           ││
│ │ D  backend/src/git/old.ts                   +0 −25           ││
│ │ R  src/old/path.ts → src/new/path.ts        +0  −0           ││
│ │ ...                                                          ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

Resizable via drag handle on top edge. State persisted (Plan 5a webview state).

Empty state: nothing selected → drawer collapsed.

## Components

```
web/src/components/CommitDetails/
├── CommitDetails.tsx               # main container (existing, gut and rewrite)
├── CommitHeader.tsx                # hash + subject + close + actions
├── CommitMeta.tsx                  # author/committer/signature/refs row
├── CommitBody.tsx                  # markdown rendered body
├── FileChangeList.tsx              # virtualized file list
├── FileChangeRow.tsx               # single file row, click → diff
├── CopyMenu.tsx                    # dropdown with copy actions
└── RemoteLinkMenu.tsx              # "Open on..." dropdown
```

## Data flow

```
selectedHash (store) changes
  ↓
useCommitDetails(selectedHash):
  ↓ fetch commits:getDetails(hash) → body, signature, stats
  ↓ fetch commits:getFileChanges(hash) → files[]
  ↓ cached per-hash via react-query or store
  ↓
<CommitDetails /> renders
```

Parallel fetches (details + file changes) so UI renders header+body fast, file list streams in.

Loading state: skeleton in body area, "Loading files..." in file list.

## File diff

### VS Code mode

Click file → `vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title)` opens native diff editor.

URIs built via VSCode's `git:` URI scheme already provided by the git extension:

```ts
const leftUri = vscode.Uri.parse(`git:${path}?${JSON.stringify({ path, ref: parentHash })}`);
const rightUri = vscode.Uri.parse(`git:${path}?${JSON.stringify({ path, ref: commitHash })}`);
```

Wire into new handler `diff.handler.ts`. Webview posts `diff:openFile { hash, path }` → handler resolves parent hash via `commits:getDetails` → opens diff editor.

For renames (status R): left URI uses `oldPath`, right uses `path`.

### Standalone mode

VS Code diff editor not available. Inline custom diff viewer:

- New backend endpoint `commits:getFileDiff { hash, path } → { hunks: DiffHunk[] }`
  - Backend runs `git diff <parent> <hash> -- <path>` and parses unified diff
- Frontend renders side-by-side or inline view via `react-diff-viewer-continued` (or roll own — small)
- Opens in modal or replaces details drawer

Reuse same UI for both modes? Yes — even in VS Code mode, allow "View Inline" toggle as fallback when VS Code diff command unavailable (e.g., huge files). Modal viewer = shared component.

```
web/src/components/DiffViewer/
├── DiffViewer.tsx                  # modal shell
├── DiffViewer.utils.ts             # parse unified diff into hunks
├── DiffHunk.tsx                    # one hunk render
└── DiffLine.tsx                    # one line (added / removed / context)
```

## Copy / Open actions

`CopyMenu` dropdown items:

- Copy SHA (full)
- Copy SHA (short, 7 chars)
- Copy Subject
- Copy Author
- Copy Author Email
- Copy Commit Body
- Copy Patch (runs `git format-patch -1 <hash>` via new endpoint)

`RemoteLinkMenu` dropdown (per remote):

- Open commit on GitHub: `https://github.com/<owner>/<repo>/commit/<hash>`
- Open on GitLab: `https://gitlab.com/<owner>/<repo>/-/commit/<hash>`
- Open on Bitbucket: `https://bitbucket.org/<owner>/<repo>/commits/<hash>`
- Custom remote: best-effort URL inference

Remote URL parsing in `web/src/services/remoteUrl.ts`:

```ts
function inferCommitUrl(remoteUrl: string, hash: string): string | null {
  // ssh: git@github.com:owner/repo.git → https://github.com/owner/repo/commit/<hash>
  // https: https://github.com/owner/repo.git → same
}
```

VS Code mode uses `vscode.env.openExternal(uri)`. Standalone uses `window.open(url, '_blank')`.

## Right-click context menu on commit row

(Some entries belong to 5d. 5b adds read-only entries.)

```
┌─ Commit Actions ─┐
│ Copy SHA         │
│ Copy Subject     │
│ Copy Author      │
│ Copy Body        │
│ ─────────────    │
│ Open on GitHub ▸ │   (5b)
│ View Files       │   (5b: jumps to drawer file list)
│ View Diff        │   (5b)
│ ─────────────    │
│ Checkout         │   (5d)
│ Cherry-pick      │   (5d)
│ Revert           │   (5d)
│ ...              │
└──────────────────┘
```

Built with Radix UI `ContextMenu` (already in `web/src/components/ui` via shadcn).

## Signature display

`commit.signature.status` → badge:

- `good` → green `✓ Verified` with signer name on hover
- `bad` → red `✗ Bad signature`
- `untrusted` → yellow `⚠ Untrusted`
- `none` → no badge

## Sequencing

1. **5b-1**: `useCommitDetails` hook fetches both endpoints, returns combined state. Loading + error handling.
2. **5b-2**: `CommitDetails` drawer shell — resizable, close button, opens on row select.
3. **5b-3**: `CommitHeader` + `CommitMeta` + `CommitBody` rendered with markdown.
4. **5b-4**: `FileChangeList` virtualized, renders status icons, +/− stats per file.
5. **5b-5**: Signature badge.
6. **5b-6**: `CopyMenu` with all copy actions.
7. **5b-7**: Remote URL inference + `RemoteLinkMenu`. Wire both VS Code `openExternal` and `window.open`.
8. **5b-8**: VS Code diff handler: click file → `vscode.diff` opens.
9. **5b-9**: Standalone diff viewer modal + backend `commits:getFileDiff`.
10. **5b-10**: Right-click context menu for commit row (read-only entries from 5b).
11. **5b-11**: Persist drawer height in webview state.

## Backend additions

- `commits:getFileDiff { hash, path } → DiffHunk[]` (standalone-needed; useful for both)
- `commits:getPatch { hash } → string` (for "Copy Patch")

Add to Plan 1 endpoints list. Implement in `GitLogService.getFileDiff`, `GitLogService.getPatch`.

## Reference repos

- `.ai/reference/vscode-git-graph/web/main.ts` — its details panel
- `.ai/reference/vscode/extensions/git/src/historyItemDetailsProvider.ts` — official details provider
- `.ai/reference/vscode-git-graph/src/dataSource.ts` — `getCommitDetails`, `getCommitFile` for inspiration on git commands

## Risks

- Massive commits (10k file changes) — virtualize list, cap file fetch at 500 (Plan 1's `truncated` flag); "Load more" button.
- Markdown XSS — sanitize via `DOMPurify` before render. Allow only safe tags.
- Diff parsing edge cases — binary files, renames, mode changes. Surface gracefully ("Binary file changed").
- Remote URL inference brittleness — fall back to generic "Copy hash" if URL can't be inferred.

## Done when

- Selecting a commit opens drawer with body, meta, files
- Signature shows correctly when commits are signed
- File click in VS Code opens native diff
- File click in standalone opens inline diff modal
- Copy menu: all entries copy correct content
- Remote menu: opens correct URL in browser for github/gitlab/bitbucket
- Right-click on commit row shows context menu with read-only entries
- Drawer height persists across reloads
- Huge commits render without freezing UI
