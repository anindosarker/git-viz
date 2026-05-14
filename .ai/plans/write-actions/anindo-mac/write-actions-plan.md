# Plan 5d — Git Write Actions

## Goal

Mutating git operations: checkout, branch ops, merge/rebase/cherry-pick/revert/reset, tags, stashes, remote sync. Context menus + sidebar buttons + keyboard.

## Non-goals

- Read-only context menu entries (5b)
- Conflict resolution UI — delegate to VS Code's editor/SCM view
- Interactive rebase UI — out of scope, surface as "rebase to commit" only

## Decisions locked

- All write actions confirmed via modal in webview (`Cancel` / `Confirm <action>`)
- Destructive ops (reset --hard, branch -D, stash drop) require typed confirmation
- Errors surfaced inline with git stderr text + suggested next step
- Action endpoints on backend share a `GitActionService` with consistent shape: `{ ok: boolean, stdout, stderr, exitCode }`
- Webview optimistically updates state, reverts on error
- Stash side-branches rendered in graph (deferred from Plan 4)

## Actions catalog

### Checkout (already partial in `GitBranchService.checkout`)

- Checkout branch
- Checkout commit (detached HEAD warning)
- Checkout tag (detached HEAD warning)
- Switch branch (alias)
- Discard local changes if conflicting (with confirmation)

### Branch

- Create branch from commit
- Create branch from current HEAD
- Create + checkout (new branch)
- Rename branch
- Delete branch (regular `-d`)
- Force-delete branch (`-D`, typed confirmation)
- Set upstream branch

### Merge / Rebase / Cherry-pick / Revert / Reset

- Merge branch into current
- Merge --no-ff (option toggle)
- Rebase onto branch
- Rebase onto commit
- Abort current rebase / merge
- Cherry-pick commit (with `-x` annotate option)
- Revert commit (creates revert commit)
- Reset --soft to commit
- Reset --mixed to commit
- Reset --hard to commit (typed confirmation)

### Tag

- Create tag (annotated / lightweight option)
- Delete tag
- Push tag to remote

### Stash

- Stash current changes (with message)
- Stash apply
- Stash pop
- Stash drop
- Stash branch (create branch from stash)
- Stash side-branches rendered in graph (visualization)

### Remote sync

- Fetch (all remotes or one)
- Pull (fast-forward / merge / rebase)
- Push current branch
- Push --force-with-lease (typed confirmation)
- Push tags
- Add remote
- Remove remote
- Rename remote

## Backend additions

New service `GitActionService` aggregating `GitBranchService` (extends it). All return:

```ts
interface GitActionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

Endpoints (one per action, namespaced):

```
branch:create        { name, startPoint?, checkout? }
branch:rename        { from, to }
branch:delete        { name, force? }
branch:setUpstream   { branch, upstream }

checkout:ref         { ref, force? }

merge                { ref, noFF?, message? }
merge:abort          {}
rebase               { onto, interactive: false }   // interactive false-only
rebase:abort         {}
rebase:continue      {}
cherryPick           { hashes: string[], annotate? }
revert               { hash, edit? }
reset                { mode: 'soft' | 'mixed' | 'hard', target: string }

tag:create           { name, target?, annotated?, message? }
tag:delete           { name }
tag:push             { name, remote }

stash:create         { message?, includeUntracked? }
stash:apply          { ref: string }
stash:pop            { ref: string }
stash:drop           { ref: string }
stash:branch         { ref: string, branchName: string }

remote:fetch         { remote? }    // omit = all
remote:pull          { strategy: 'ff' | 'merge' | 'rebase' }
remote:push          { branch?, remote?, force?, tags? }
remote:add           { name, url }
remote:remove        { name }
remote:rename        { from, to }
```

All implemented in backend services. After successful write, backend emits invalidation event so frontend refetches `refs:getAll` + first commits page + repo info.

## Frontend components

```
web/src/components/Actions/
├── ConfirmModal.tsx              # generic confirm dialog
├── TypedConfirmModal.tsx         # for destructive ops, requires typing
├── BranchCreateModal.tsx
├── BranchRenameModal.tsx
├── MergeModal.tsx                # branch picker + --no-ff toggle
├── RebaseModal.tsx
├── CherryPickModal.tsx           # multi-select commits supported
├── RevertModal.tsx
├── ResetModal.tsx                # mode selector + target preview
├── TagCreateModal.tsx
├── StashCreateModal.tsx
├── PushModal.tsx                 # remote + branch + force toggles
└── ActionResultToast.tsx         # success / failure with stderr
```

## Context menus

`web/src/components/CommitList/CommitContextMenu.tsx` — right-click on commit row:

```
─ Commit ─
Checkout commit
─ Branch ─
Create branch from this commit…
Reset current branch to here ▸
  Soft
  Mixed
  Hard (destructive)
─ Apply changes ─
Cherry-pick
Revert
─ Tag ─
Create tag here…
─ Copy / Open ─    (from 5b)
...
```

Branch row in tree sidebar (Plan 5a) → right-click:

```
Checkout
Create branch from here…
Rename…
Delete
Force delete…
─
Merge into current
Rebase onto current
Set upstream…
```

Stash row → right-click:

```
Apply
Pop
Drop
Create branch from stash…
```

Tag row → right-click:

```
Checkout
Push to remote ▸
Delete
```

## Toolbar buttons (TopBar)

```
[ Fetch ↓ ] [ Pull ↓ ] [ Push ↑ ] [ ⋯ More ]
```

`More` menu: stash, create branch, create tag, etc.

## Confirmation patterns

Destructive ops require typed confirmation:

```
This will permanently delete branch `feature/old` and its commits if not
referenced elsewhere. This cannot be undone.

Type the branch name to confirm:  [ ____ ]   [ Cancel ] [ Delete ]
```

Affects: branch -D, reset --hard, stash drop, push --force-with-lease, tag delete, remote remove.

## Errors

Backend returns stderr verbatim. Frontend renders in toast with copy button. For common errors, add hint:

| Error pattern                            | Hint                                              |
| ---------------------------------------- | ------------------------------------------------- |
| `Your local changes would be overwritten` | "Stash or commit changes, then retry"             |
| `non-fast-forward`                        | "Pull first or use --force-with-lease"            |
| `merge conflict`                         | "Resolve in editor, then continue or abort"       |
| `not a valid object name`                | "Ref no longer exists. Refresh the view."         |

Hints in `web/src/lib/gitErrors.ts` — pattern→hint map.

## Invalidation flow

After successful write:

```
backend emits → "git:state-changed" { kinds: ['refs', 'commits', 'head'] }
  ↓
webview receives via message
  ↓
store invalidates: refetch refs:getAll, repo:getInfo, commits:getPage page 1
  ↓
graph rerenders with new state
```

Plan 5e's file watcher provides the same notification for external git changes — same invalidation pipe.

## Stash side-branches in graph

Stashes are commits with parents `[base, indexState, untrackedState?]`. Currently `git log --all` doesn't include them. To show:

- Backend includes `--stash` flag in `git log --all` calls (configurable; on by default for `gitlens-like` preset).
- Stashes already returned by `refs:getAll.stashes` with `commitHash`.
- In `join.ts` (Plan 3), mark stash commits with `kind: 'stash'` row type.
- Renderer treats stash rows specially: dashed circle, "💾" icon, dim subject.

Add to Plan 3 row kinds: `'HEAD' | 'node' | 'working-tree' | 'stash' | 'incoming' | 'outgoing'`.

## Sequencing

1. **5d-1**: `GitActionService` skeleton + result shape. Wire ConfirmModal generic.
2. **5d-2**: Checkout (branch, commit, tag) + state invalidation pipeline.
3. **5d-3**: Branch create/rename/delete + sidebar + modals.
4. **5d-4**: Merge / rebase / abort. Abort modal.
5. **5d-5**: Cherry-pick + revert.
6. **5d-6**: Reset (soft/mixed/hard) with destructive confirm.
7. **5d-7**: Tag create/delete/push.
8. **5d-8**: Stash create/apply/pop/drop/branch.
9. **5d-9**: Stash side-branch graph rendering. New row kind through Plan 3 chain.
10. **5d-10**: Remote ops: fetch / pull / push (and `--force-with-lease`).
11. **5d-11**: Remote add/remove/rename.
12. **5d-12**: Error hints map + toast UI.
13. **5d-13**: Verify all flows on real repos. No partial-success states leaving repo dirty.

## Risks

- Long-running ops (pull, push) — block UI? Disable button + show spinner. Surface progress via stderr streaming.
- Concurrent edits from VS Code's built-in git extension — race. Mitigate via 5e file watcher invalidation.
- Detached HEAD after checkout commit — warn user, surface "Create branch from here?" CTA.
- Merge/rebase conflicts — abandon mid-flow. Surface "you have unresolved conflicts" badge + Continue/Abort buttons in TopBar.
- Force push to main — refuse by default with override. Hardcoded guard against `--force` to main/master without typed confirm.

## Done when

- All actions in catalog work end-to-end in extension + standalone
- Destructive ops require typed confirmation
- Errors show stderr + hints when matched
- Stash side-branches appear in graph for `gitlens-like` preset
- After every action: graph refreshes within ~200ms
- No git command runs without a confirmation modal except `fetch` (read-only)
- Real repo dogfooding: 20+ random actions don't corrupt state
