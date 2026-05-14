# Plan 5e — Standalone Polish + Multi-Repo

## Goal

Polish standalone server (auth, CLI, file watching, hot reload) and add multi-repo support (multi-root workspace + submodules + worktrees + repo switcher).

## Non-goals

- Mobile-friendly view (deferred)
- PR/MR integration (deferred)
- AI features (deferred)

## Decisions locked

- File watcher uses `chokidar` (cross-platform, battle-tested)
- Watcher watches `.git/HEAD`, `.git/refs/`, `.git/packed-refs`, `.git/logs/` — narrow scope
- Multi-root: repo switcher in TopBar (extension uses workspace folders, standalone uses CLI list)
- Submodules: tree row decoration + recursive list; opening switches active repo
- Worktrees: tree row decoration; switch via "Open Worktree" command
- Standalone auth: `--token <secret>` flag; clients send `Authorization: Bearer <token>` header

## File watcher

```
backend/src/git/GitWatcher.ts
```

Wraps `chokidar.watch` for one repo:

```ts
export class GitWatcher {
  constructor(private cwd: string, private onChange: (kinds: ChangeKind[]) => void) {}

  start() {
    const gitDir = path.join(this.cwd, '.git');
    const watcher = chokidar.watch([
      `${gitDir}/HEAD`,
      `${gitDir}/refs/**`,
      `${gitDir}/packed-refs`,
      `${gitDir}/logs/**`,
      `${this.cwd}/**/*`,         // for working-tree dirty bit (use ignore)
    ], { ignored: [`${gitDir}/index.lock`, `${this.cwd}/node_modules/**`] });

    watcher.on('all', (event, filePath) => {
      const kinds = classifyChange(filePath, this.cwd);
      if (kinds.length) this.onChange(kinds);
    });
  }
}
```

`classifyChange` maps file path → change kinds:

```ts
type ChangeKind = 'head' | 'refs' | 'commits' | 'workingTree' | 'stashes';
```

Debounce events 200ms — git ops often touch many files.

## Hot reload pipeline

Watcher fires → backend emits `git:state-changed` event over transport → frontend invalidates store slices accordingly:

| ChangeKind   | Invalidates                                  |
| ------------ | -------------------------------------------- |
| head         | repo info, current branch, working-tree row  |
| refs         | refs snapshot, may refetch commits page 1    |
| commits      | first page (new commits), may shift cursor   |
| workingTree  | working-tree row only                        |
| stashes      | stash list, stash rows if in graph           |

Same invalidation pipe as 5d's post-write events.

### VS Code transport

`WebviewMessageHandler` exposes an outbound channel: `webview.postMessage({ kind: 'event', name: 'git:state-changed', payload: { kinds } })`. Webview listens, dispatches store invalidations.

### Standalone transport

Server-Sent Events on `/api/events` endpoint. Frontend connects via `EventSource`. Same payload shape.

## Multi-repo

### Repo list source

- **Extension**: `vscode.workspace.workspaceFolders` filtered to git repos (via `GitRepoService.getRepoRoot`)
- **Standalone**: CLI args `--repo <path>` (repeatable), or config file `~/.git-viz/config.json` with `repos: string[]`

### Repo switcher UI

TopBar dropdown:

```
[Repo: git-viz ▼]
  ├ git-viz                /Users/anindo/Work/.../git-viz
  ├ other-project          /Users/anindo/Work/.../other-project
  └ + Open repo…           (file picker)
```

Switching invalidates entire store. New repo → bootstrap → render.

State keyed per repo path in webview state (so each repo remembers its preset, selection, scroll).

### Submodule support

`backend/src/git/GitSubmoduleService.ts`:

```ts
list(cwd): Promise<GitSubmodule[]>;   // git submodule status --recursive
```

```ts
interface GitSubmodule {
  name: string;
  path: string;      // relative
  hash: string;      // pinned commit
  url: string;
  initialized: boolean;
}
```

Tree view (Plan 5a) shows submodules as expandable nodes. Clicking opens submodule as new active repo.

### Worktree support

`backend/src/git/GitWorktreeService.ts`:

```ts
list(cwd): Promise<GitWorktree[]>;    // git worktree list --porcelain
```

```ts
interface GitWorktree {
  path: string;
  head: string;         // commit
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked: boolean;
}
```

Tree view → expandable "Worktrees" node. Switch active repo via right-click "Open Worktree".

Worktree-create/-remove deferred (write action 5d adjacent, can fold in if needed).

## Standalone auth

Threat: localhost open by default — anyone on multi-user host can read repo contents.

Add `--token <secret>` CLI flag:

```bash
node server/dist/index.js --repo /path --token sk-abc123
```

Server:

- Generates token if `--token` not provided (logs to stdout, requires explicit user copy)
- Or accepts user-provided token
- All `/api/*` routes require `Authorization: Bearer <token>` header
- Web client reads token from URL hash on first load: `http://localhost:3000/#token=sk-abc123` → stores in sessionStorage, strips from URL
- Optionally `--no-auth` for trusted dev environments (only allow when `--bind 127.0.0.1`)

Existing extension mode doesn't need auth — webview ↔ extension via postMessage, no network surface.

## CLI args (standalone)

```bash
node server/dist/index.js [options]

Options:
  --repo <path>            Repo path (repeatable, sets multi-repo list)
  --port <n>               Default 3000
  --bind <addr>            Default 127.0.0.1
  --token <secret>         Auth token (auto-generated if omitted)
  --no-auth                Disable auth (dev only, requires bind=127.0.0.1)
  --fixture <name>         Use test fixture DAG instead of real repo (for visual testing)
  --open                   Auto-open browser
  --help                   Usage
```

Implemented with `commander` or stdlib `parseArgs`. Defaults sensible for "just run it".

## File watcher integration with extension

Extension already has `vscode.workspace.createFileSystemWatcher` available — use that instead of chokidar in VS Code mode. Same `GitWatcher` interface, different impl behind a factory:

```ts
makeWatcher(cwd, onChange): GitWatcher  // returns chokidar or vscode watcher
```

## Sequencing

1. **5e-1**: `GitWatcher` skeleton with chokidar + classifyChange. Unit test classify rules.
2. **5e-2**: VS Code-flavored watcher using `createFileSystemWatcher`. Same interface.
3. **5e-3**: SSE endpoint `/api/events` on standalone. Webview message channel on extension.
4. **5e-4**: Webview store invalidation by kind. Test hot reload with manual git ops.
5. **5e-5**: Standalone CLI args. Help text, defaults.
6. **5e-6**: Standalone auth (token gen, header check, URL hash flow).
7. **5e-7**: Multi-repo discovery (workspace folders + CLI list).
8. **5e-8**: Repo switcher in TopBar.
9. **5e-9**: Per-repo state persistence (webview state keyed by repo path).
10. **5e-10**: `GitSubmoduleService` + tree view integration.
11. **5e-11**: `GitWorktreeService` + tree view integration.
12. **5e-12**: Dogfood — open git-viz repo + vscode-git-graph clone + a submodule-using repo, switch between, verify isolation.

## Risks

- Chokidar polling fallback on Linux with inotify limits — surfaces as missed events. Mitigate: log warning + offer manual refresh.
- File watcher on huge working trees (Linux kernel watch limits). Mitigate: ignore `node_modules`, `dist`, etc. by default; configurable.
- SSE connection drops behind proxies. Mitigate: auto-reconnect with backoff.
- Token in URL hash leaks via browser history. Mitigate: strip on load; warn if user pastes shareable URL.
- Worktree paths can be outside repo's tree → resolve absolute paths.
- Submodule URLs may not be accessible (private repos). Surface gracefully.

## Reference repos

- `.ai/reference/vscode-git-graph/src/repoFileWatcher.ts` — watcher patterns
- `.ai/reference/vscode-git-graph/src/repoManager.ts` — multi-repo state
- `.ai/reference/vscode/extensions/git/src/repository.ts` — official repo state management with worktrees + submodules

## Done when

- Watcher: external `git commit` from terminal triggers in-app refresh within 1s
- Repo switcher works in both extension and standalone
- Each repo remembers its preset, selection, scroll
- Submodules listed in tree, openable as active repo
- Worktrees listed in tree, switchable
- Standalone auth gates `/api/*` unless `--no-auth` + localhost bind
- CLI help shows all options
- No file watcher leaks (verified after switching repos 10 times)
