# Plan 5 — Finish Extension (Overview)

Parent index. Splits into 5 sub-plans, each shippable standalone.

## Dev order

1. **5a — UX shell** → `.ai/plans/ux-shell/`
2. **5b — Commit details + diff** → `.ai/plans/commit-details/`
3. **5c — Search & filter** → `.ai/plans/search-filter/`
4. **5d — Git write actions** → `.ai/plans/write-actions/`
5. **5e — Standalone + multi-repo** → `.ai/plans/standalone-multirepo/`

Each sub-plan ships before next starts. Agent teams can run sub-plans in parallel where deps allow (5b can start after 5a; 5c+5d after 5b; 5e last).

## Scope per sub-plan

### 5a — UX shell

Home for everything else. Settles activation, navigation, persistence.

- Activity bar icon + view container
- Sidebar tree view (repos / branches / tags / stashes)
- Status bar item (current branch + ahead/behind)
- Settings UI (graph style, columns, theme, etc.)
- VS Code theme token integration (canvas + DOM colors)
- Webview state persistence (selection, scroll, preset survive reload)
- Activation events (replace `*` with focused triggers)
- Keyboard shortcuts (j/k navigation, enter, /, etc.)

### 5b — Commit details + diff

Primary commit interaction.

- Details panel UI (message body, signature badge, author, stats)
- File change list per commit (use `commits:getFileChanges` from Plan 1)
- File diff viewer — open VS Code diff editor for extension mode, custom diff viewer for standalone
- Copy hash / message / author / remote URL
- "Open on GitHub/GitLab" (remote URL inference)
- Right-click context menu on commit row

### 5c — Search & filter

Discoverability layer.

- Free-text search (subject/body/author/hash)
- Ref filter chips (toggle branches/tags/remotes visibility)
- Author filter
- Date range filter
- File path filter (commits touching path)
- Filter sidebar UI
- Backend endpoint extensions for filtered queries

### 5d — Git write actions

Mutating ops with context menu + sidebar buttons.

- Checkout commit / branch / tag (extension has stub; refactor for standalone)
- Branch: create / rename / delete (partial in `GitBranchService`)
- Merge / rebase / cherry-pick / revert / reset (with confirmation modals)
- Tag create / delete
- Stash create / pop / apply / drop / list
- Fetch / pull / push (remote sync)
- Stash side-branches rendered in graph (deferred from Plan 4)
- Confirmation modals for destructive ops
- Error reporting with git stderr surfaced

### 5e — Standalone + multi-repo

Polish + breadth.

- File watcher on `.git/` (chokidar) — auto-refresh on external git ops
- Hot reload UI on watcher events
- Multi-root workspace (VS Code) + repo switcher (standalone)
- Submodule support (recurse list, badge in tree)
- Worktree support (list, switch)
- Standalone server auth (token gate via `--token` flag, header check)
- CLI args (`--port`, `--repo`, `--token`, `--fixture`)
- Export graph PNG/SVG

## Deferred to post-v1 (no plan yet)

- PR/MR integration (GH/GL badges on branches)
- Inline blame on editor
- AI-assisted features (compose commits, summarize ranges)
- Telemetry / error reporting backend
- Mobile-friendly standalone view

## Status

| Sub-plan | Doc                                                                                         | Status      |
| -------- | ------------------------------------------------------------------------------------------- | ----------- |
| 5a       | `.ai/plans/ux-shell/anindo-mac/ux-shell-plan.md`                                            | Drafted     |
| 5b       | `.ai/plans/commit-details/anindo-mac/commit-details-plan.md`                                | Drafted     |
| 5c       | `.ai/plans/search-filter/anindo-mac/search-filter-plan.md`                                  | Drafted     |
| 5d       | `.ai/plans/write-actions/anindo-mac/write-actions-plan.md`                                  | Drafted     |
| 5e       | `.ai/plans/standalone-multirepo/anindo-mac/standalone-multirepo-plan.md`                    | Drafted     |
