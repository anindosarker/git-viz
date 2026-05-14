# Plan 2 — Refactor + Organization (Big Bang)

## Goal

After Plan 1 lands new backend shape, sweep entire repo: package manager, structure, type dedup, frontend reshape, transport refactor, cleanup. Land on layout that won't fight plans 3–5.

## Non-goals

- Backend git data endpoints (Plan 1 — done)
- Graph algorithm/renderer contracts (Plan 3)
- New algorithms (Plan 4)
- Feature additions beyond what current code does (Plan 5)

## Order

Plan 1 first (backend types + endpoints exist). Then Plan 2 — refactor with target shape known.

Two valid build sequences inside Plan 2:

- Phase A — Foundation (tooling baseline)
- Phase B — Cleanup (delete stale, kill dead)
- Phase C — Structural moves (graph/, types/, services/, hooks/)
- Phase D — Transport refactor (handler registry, route split)
- Phase E — Verify (both apps render, scripts work, types pass)

Run A → B in parallel by separate teammates. C waits on A. D waits on Plan 1 + A. E gates done.

## Phase A — Foundation

### A1. Switch to pnpm

- Add `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'web'
    - 'shared'
    - 'backend'
  ```
- Add `.npmrc`:
  ```
  public-hoist-pattern[]=*types*
  public-hoist-pattern[]=@types/*
  shamefully-hoist=false
  strict-peer-dependencies=false
  ```
- Delete `package-lock.json`. Run `pnpm install`. Commit `pnpm-lock.yaml`.
- Rewrite root `scripts`:
  ```json
  "vscode:prepublish": "pnpm --filter web build && pnpm compile",
  "compile": "tsc -p ./",
  "watch": "tsc -watch -p ./",
  "build:all": "pnpm -r build",
  "type-check": "pnpm -r type-check",
  "lint": "pnpm -r lint",
  "format": "prettier --write .",
  "test": "pnpm -r test"
  ```
- Each pkg gets `type-check`, `lint`, `build` scripts if missing.
- Verify `vsce package` works under pnpm. If symlinks confuse it: bundle deps via esbuild into `out/extension.js` so `node_modules` doesn't ship. Currently main is `./out/extension.js`, raw tsc output — switch to esbuild bundle.

### A2. TypeScript project references

- Root `tsconfig.base.json` with common compiler opts (strict, ES2022, NodeNext, etc.)
- Each pkg `tsconfig.json` extends base, adds `references` to upstream pkgs
- `shared` referenced by `backend` + `web` + `src/`
- `backend` referenced by `src/` (extension code) — verify
- Top-level `tsc -b` builds whole graph in correct order

### A3. ESLint flat config across all pkgs

- Root `eslint.config.mjs` already exists for `src/` — extend to glob `**/*.{ts,tsx}` excluding `dist`, `out`, `node_modules`, `.ai`
- Per-pkg overrides if needed (e.g., react rules in `web/`)
- Add `@typescript-eslint/no-unused-vars` enforced
- Add `import/no-extraneous-dependencies` to catch missing deps once pnpm strictness exposes them

### A4. Prettier

- Root `.prettierrc` (single config, no per-pkg variants)
- Root `.prettierignore` covers `out`, `dist`, `.ai`, `*.lock`
- `pnpm format` runs prettier across repo

### A5. Vitest

- Add to `web` and `shared` (`backend` already needs it for Plan 1)
- Single root `vitest.config.ts` with workspace setup, or per-pkg configs. Pick per-pkg — simpler.
- Test files colocated: `foo.ts` + `foo.test.ts`
- Coverage optional — skip unless trivial

## Phase B — Cleanup

### B1. Stale build artifacts in source trees

- Delete `web/src/App.js.map`, `web/src/main.js.map`, `web/src/lib/utils.js.map`, `web/src/components/ui/table.js.map`, `web/src/components/ui/button.js.map`
- Delete committed `*.js` and `*.js.map` from `backend/src/git/` (only `.ts` belongs in src; build outputs live in `backend/dist/`)
- Add stricter `.gitignore`:
  ```
  **/src/**/*.js
  **/src/**/*.js.map
  ```
  (carefully — vanilla JS source files would be blocked; verify no legit `.js` lives under any `src/`. None found.)

### B2. Dead code

- `src/StatusBarItem.ts` — not imported by `extension.ts`. Delete unless wired up in Plan 5.
- `src/test/` — verify still relevant (default vsce scaffolding). Trim or delete.
- `web/server.cjs` — duplicate of root `server.cjs`? Verify. Pick one.
- `vsc-extension-quickstart.md` — vsce scaffold. Delete.

### B3. README

- Strip "Hello World" command references (line ~105). Real command is `GitViz: Show Commit Graph`.
- Update install/dev sections to use pnpm
- Add section linking to `.ai/plans/` for contributors

### B4. Naming

- Leave PascalCase folders + camelCase files convention (consistent today, mostly). Don't normalize for normalization's sake.
- Exception: `web/src/hooks/useGit.hook.ts` and `useGraph.hook.ts` — drop redundant `.hook` infix. Files in `hooks/` are hooks.

## Phase C — Structural moves

### C1. Graph code restructure

`web/src/utils/graph.ts` → split into folder:

```
web/src/graph/
├── index.ts           # public re-exports
├── types.ts           # Swimlane, GraphRow, GraphData
├── colors.ts          # color palette + assignment helpers
├── algos/
│   └── rolling.ts     # current calculateGraph, exported as { id: "rolling", compute }
└── render/
    └── (empty — Plan 3 fills this)
```

Plan 3 turns `algos/rolling.ts` into a `GraphImpl`. Plan 2 just gets the dir structure right. Existing `CommitGraph.tsx` + `GraphRow.tsx` keep working by importing from `@/graph` instead of `@/utils/graph`.

### C2. Type dedup

- `web/src/types/git.ts` currently extends old `GitCommit`. After Plan 1 lands `GitCommitSummary` + `GitCommitDetails` + `GitRefPointer`:
  - `web/src/types/git.ts` becomes view-model layer only — e.g., `CommitRow = GitCommitSummary & { color?, refs: GitRefPointer[] }` (refs joined client-side)
  - Re-export raw shared types from this file too, single import surface
- Kill any leftover ad-hoc commit shapes across `web/src/`

### C3. Frontend services for paged + lazy data

`web/src/services/git-data.service.ts` — currently single class for one endpoint. Refactor:

```
web/src/services/
├── transport.ts       # vscode webview / fetch transport abstraction
├── git.service.ts     # high-level: getBootstrap, getNextPage, getDetails, getFileChanges, getRefs, doAction
└── cache.ts           # in-memory commit + refs cache, dedup, invalidation hooks
```

`transport.ts` chooses between `acquireVsCodeApi()` postMessage (extension mode) and `fetch('/api/...')` (standalone mode). Runtime feature detect.

### C4. Hooks

- Rename `useGit.hook.ts` → `useGit.ts`
- Rename `useGraph.hook.ts` → `useGraph.ts`
- `useGit` rewritten for cursor pagination + refs query + lazy details
- `useGraph` kept (per E earlier) — becomes seam for algo selection in Plan 3

### C5. State management

Currently ad-hoc `useState` in `App.tsx`. With paged commits + refs + selection + algo choice, push into a tiny store:

- Option a: Zustand (~1 KB, trivial)
- Option b: React Context + useReducer
- Option c: Stay ad-hoc until pain

Pick (a). Single `web/src/state/store.ts` exposing slices for commits, refs, selection, algo, view.

## Phase D — Transport refactor

### D1. VS Code side: handler registry

`src/panels/WebviewMessageHandler.ts` is currently a big switch. Plan 1 adds 6+ endpoints — registry pattern:

```
src/panels/
├── MainPanel.ts
├── messageRouter.ts        # registry + dispatch
└── handlers/
    ├── repo.handler.ts
    ├── commits.handler.ts
    ├── refs.handler.ts
    ├── bootstrap.handler.ts
    ├── actions.handler.ts  # checkout, merge, etc.
    └── system.handler.ts
```

Each handler exports `{ command: string; handle(payload, ctx) }`. Router maps command → handler.

### D2. Standalone server

`server.cjs` at root. Plan 1 adds endpoints. Convert to TypeScript + split:

```
server/
├── index.ts               # express bootstrap, picks repo path from argv
├── routes/
│   ├── repo.route.ts
│   ├── commits.route.ts
│   ├── refs.route.ts
│   ├── bootstrap.route.ts
│   └── actions.route.ts
└── package.json           # depends on @git-viz/backend
```

Add `server` to pnpm workspace. Root `server.cjs` becomes one-line shim invoking compiled output, or replaced entirely.

Handlers and routes share the same backend services — DRY across transports.

## Phase E — Verify

1. `pnpm install` clean
2. `pnpm -r type-check` green
3. `pnpm -r lint` green
4. `pnpm format` no diff
5. `pnpm -r test` passes (unit tests for parsers, graph algo)
6. `pnpm --filter web build` produces `web/dist/`
7. `pnpm compile` produces `out/extension.js`
8. Launch standalone: `node server/dist/index.js <repo>` → browser shows graph + lazy details
9. Launch extension: F5 in VS Code → command palette → `GitViz: Show Commit Graph` → renders
10. Both modes use same backend services, same frontend transport, no regressions vs pre-refactor

## Reference repos

Mine these during impl:

- `.ai/reference/vscode-git-graph/` — handler structure (`dataSource.ts`, `gitGraphView.ts`), webview message patterns
- `.ai/reference/vscode/extensions/git/src/` — service organization, registry patterns, command dispatch

Read, don't copy.

## Risks

- pnpm + vsce packaging — verify VSIX builds + extension runs. Mitigation: bundle with esbuild (single-file output).
- TypeScript project refs misconfig — common pain. Mitigation: incremental, test build at each step.
- Frontend store rewrite while paged data loading is new — two new things at once. Mitigation: land pagination behind Zustand store in same teammate, single PR scope.
- Standalone server TS conversion — easy to break dev loop. Mitigation: keep old `server.cjs` working until new `server/` proven.

## Done when

- Phase E checklist all green
- No `.js` or `.js.map` in any `src/`
- `pnpm format && pnpm -r type-check && pnpm -r lint && pnpm -r test` clean
- README matches reality
- Standalone server + extension render identical UI from same backend services
- Plan 3 (graph contracts) can plug into `web/src/graph/` cleanly with no further refactor
