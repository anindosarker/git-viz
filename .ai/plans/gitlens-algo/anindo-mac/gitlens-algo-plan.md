# Plan 4 — GitLens-like Graph Algorithm

## Goal

Implement `gitlens-topo` algorithm. Plugs into Plan 3 contracts. Powers the `gitlens-like` preset. Other two presets keep using `rolling` (already wrapped in Plan 3).

## Non-goals

- New renderers / columns / presets (done in Plan 3)
- Backend changes (Plan 1, amended for `order` param)
- Stash visibility, search, diff — Plan 5
- Lane compaction (deferred)

## Decisions locked

- A. Ship only `gitlens-topo`. `rolling` covers other presets.
- B. Backend gets `order: 'topo' | 'date'` on `commits:getPage` (Plan 1 amended).
- C. Branch tip priority: HEAD → local branches by recent commit date desc → remote tracking → other remotes → tags.
- D. Lane reuse only, no compaction.
- E. Per-branch color stability (ref-id keyed colorMap, primed from refs snapshot).
- F. Vitest unit tests for known DAG shapes. Mandatory.
- G. Local test scripts only, no CI bench yet.

## Algorithm overview

Single pass over topo-ordered commits, like `rolling`, but with:

1. **Lane pool seeded from branch tips** before walking. HEAD branch claims lane 0.
2. **Color map seeded from refs**. Each branch ref gets stable color from `colorRegistry`. HEAD gets distinguished color.
3. **Lane reuse**: when a lane's "alive" commit set drains (no remaining children to process for that ref), lane goes back to pool. Next-encountered new branch consumes lowest available lane index.
4. **HEAD pinning**: lane 0 reserved for HEAD's branch chain throughout the visible history. Other lanes negotiated.
5. **Working-tree row injection**: if `workingTree.dirty`, prepend a `kind: 'working-tree'` row pointing at HEAD.
6. **HEAD row kind**: commit matching `head.hash` gets `kind: 'HEAD'` (Plan 3 contract).

Same incremental-state contract as `rolling` so paged loading works.

## Pre-walk: tip allocation

```ts
function allocateLanes(refs: GitRefsSnapshot, head: GitHeadState): TipAllocation {
  // Priority order per decision C
  const ordered = [
    ...findHeadRef(refs, head),                 // 1 entry max
    ...localBranchesByDateDesc(refs, head),     // excluding head
    ...remoteTrackingBranches(refs),
    ...otherRemoteBranches(refs),
    ...tags(refs)
  ];

  // colorMap keyed by ref.name → color slot
  const colorMap = new Map<string, string>();
  const palette = COLOR_REGISTRY;
  let colorIdx = 0;

  for (const ref of ordered) {
    colorMap.set(ref.name, palette[colorIdx++ % palette.length]);
  }

  // lanes keyed by commit hash → lane index reservation (for tip commits only)
  const tipLanes = new Map<string, number>();
  ordered.forEach((ref, idx) => {
    if (!tipLanes.has(ref.commitHash)) {
      tipLanes.set(ref.commitHash, idx);
    }
  });

  return { colorMap, tipLanes, headCommit: head.hash };
}
```

`tipLanes` says: "the lane at index `idx` is born at `commitHash`". During the walk, when first encountering a commit that's a tip, slot it into its reserved lane.

## Walk: single pass

```ts
function compute(input: ComputeInput): ComputeResult {
  const { commits, refs, head, workingTree, prevState } = input;

  let state: GitLensTopoState =
    prevState ?? initialState(refs, head);

  const rows: GraphRow[] = [];

  if (!prevState && workingTree?.dirty) {
    rows.push(makeWorkingTreeRow(head, state));
  }

  for (const commit of commits) {
    const row = stepCommit(commit, state, refs, head);
    rows.push(row);
  }

  return { rows, state, laneCount: state.maxLanesSeen };
}
```

`stepCommit` per-commit logic:

1. Read `inputSwimlanes = state.outputSwimlanes` from previous row (deep clone).
2. Find commit's position:
   - If commit is a tip (`tipLanes.has(commit.hash)`): use reserved lane index. Pad inputSwimlanes with empty slots if necessary, OR place into next free slot up to reserved index.
   - Else find existing swimlane with `id === commit.hash`. Pick leftmost match.
   - Else this is a "rootless" appearance (parent already gone) — place at next free index.
3. Build `outputSwimlanes`:
   - For each input swimlane:
     - If it's this commit's swimlane: replace with `parents[0]` if present, else drop (lane dies — reuse).
     - Else pass through.
   - For each parent beyond `parents[0]` (merges): place at first free slot (lowest index ≥ smallest free), or append.
4. **Lane reuse**: if commit's swimlane had `id === commit.hash` and `commit.parents.length === 0`, lane drops out entirely (don't pass through). Next merge can take its index.
5. **Color resolution**: lane color = colorMap[ref.name] of any ref pointing at commit, else inherit from input swimlane, else first-parent's color (which propagates the ref's color forward since first-parent inherits ref).
6. Determine `kind`: `'HEAD'` if `commit.hash === head.hash`, else `'node'`.
7. Track `maxLanesSeen = max(maxLanesSeen, outputSwimlanes.length)` in state.

```ts
interface GitLensTopoState {
  outputSwimlanes: GraphNode[];           // last row's output
  colorMap: Map<string, string>;          // ref.name → color (stable)
  tipLanes: Map<string, number>;          // commitHash → reserved lane idx
  headBranchName?: string;
  maxLanesSeen: number;
  // No commits cached — only pass-through state
}
```

State is small: O(active branches). Passes cleanly across pages.

## Color rules

- Pre-seed from refs: `colorMap.set(ref.name, palette[i])` in priority order.
- HEAD branch always palette[0] (or distinguished color).
- For commits without direct refs:
  - Inherit from input swimlane (already painted with branch's color via first-parent chain).
  - First-parent rule guarantees branch color propagates from tip back through history.

## Color palette

Borrow from VSCode SCM Graph (already imported via theme tokens):

```ts
const COLORS = [
  'var(--vscode-scmGraph-foreground1)',  // #FFB000
  'var(--vscode-scmGraph-foreground2)',  // #DC267F
  'var(--vscode-scmGraph-foreground3)',  // #994F00
  'var(--vscode-scmGraph-foreground4)',  // #40B0A6
  'var(--vscode-scmGraph-foreground5)',  // #B66DFF
];
```

Standalone mode: same colors, hardcoded.

## File layout

Lands in Plan 2 / Plan 3 directories:

```
web/src/graph/algos/
├── types.ts                      # from Plan 3
├── registry.ts                   # from Plan 3
├── rolling.ts                    # from Plan 3
└── gitlens-topo/
    ├── index.ts                  # exports GraphAlgorithm
    ├── compute.ts                # main loop
    ├── allocate.ts               # pre-walk tip allocation
    ├── stepCommit.ts             # per-row logic
    ├── state.ts                  # GitLensTopoState type + init
    ├── colors.ts                 # palette + assignment helpers
    └── __tests__/
        ├── linear.test.ts
        ├── merge.test.ts
        ├── octopus.test.ts
        ├── criss-cross.test.ts
        ├── lane-reuse.test.ts
        ├── head-leftmost.test.ts
        ├── incremental.test.ts
        └── fixtures/
            ├── dag-builders.ts   # tiny DSL for constructing test DAGs
            └── *.json            # snapshotted outputs
```

## Tests

Each DAG case:

1. **linear** — 5 commits in chain. One lane. HEAD on tip. → row count = 5, all in lane 0, all share HEAD branch color.
2. **single-merge** — main + feature branched 3 commits back, merged. → feature lane appears at fork, dies after merge. Two colors.
3. **octopus** — merge with 3+ parents. → multiple new lanes appear at merge commit.
4. **criss-cross** — two branches that cross-merge each other. → lane swap behavior verified.
5. **lane-reuse** — branch A dies at commit X, branch B born at commit Y (Y comes after X). → B reuses A's lane index, not new.
6. **head-leftmost** — HEAD is not the chronologically newest branch but must occupy lane 0.
7. **working-tree** — dirty working tree → top row is `kind: 'working-tree'`.
8. **HEAD-kind** — commit at `head.hash` has `kind: 'HEAD'`.
9. **incremental** — `compute(allCommits)` matches `compute(firstHalf)` then `compute(secondHalf, prevState)`. Property test with seeded random DAGs.
10. **color-stability** — Same branch ref, color matches in every row it appears.

DAG builder DSL:

```ts
const dag = buildDag()
  .commit('a').refs('main', 'HEAD')
  .commit('b').parent('a')
  .commit('c').parent('a').refs('feature')
  .commit('d').parents('b', 'c').refs('main')
  .build();

// Returns { commits: GitCommitSummary[], refs: GitRefsSnapshot, head: GitHeadState }
```

Keeps tests readable. Worth the helper.

## Verification UI

Standalone server fixture mode:

```
node server/dist/index.js --fixture=lane-reuse
```

Loads `__tests__/fixtures/lane-reuse.dag.json`, renders both `rolling` and `gitlens-topo` side-by-side. Eyeball compare.

## Sequencing

1. **D-1**: DAG builder DSL + fixture format. Land in `__tests__/`.
2. **D-2**: `allocate.ts` + state init. Unit-test allocation order against fixtures.
3. **D-3**: `stepCommit.ts` for the simple cases (linear, single merge). Tests pass.
4. **D-4**: Lane reuse logic. `lane-reuse.test` passes.
5. **D-5**: HEAD-leftmost enforcement. `head-leftmost.test` passes.
6. **D-6**: Working-tree row + HEAD row kind. Tests pass.
7. **D-7**: Incremental state correctness. Property test passes.
8. **D-8**: Wire into `algorithmRegistry`. `gitlens-like` preset uses it.
9. **D-9**: Backend `order: 'topo'` plumbed end-to-end. Preset auto-requests topo.
10. **D-10**: Visual verification on real repo (this repo, big repo).

## Risks

- **Topo order quirks**: `git log --topo-order` may put a child after its parent in time when parent is on a stale branch. UI shows this as "going back in time" — expected, GitLens does the same. Document it.
- **Octopus merge**: Multi-parent placement is fiddly. Reference VSCode SCM `toISCMHistoryItemViewModelArray` lines 334–356 closely.
- **Tip allocation collisions**: Two refs pointing at same commit (e.g., `main` and `origin/main`). Only highest-priority gets lane reservation; lower-priority refs share lane via colorMap.
- **HEAD detached state**: No `head.branch`. Treat HEAD commit itself as the "ref" — lane 0, distinguished color.
- **Algorithm correctness on edge DAGs**: Mitigate via fixtures + property tests.

## Reference mining

- `vscode/src/vs/workbench/contrib/scm/browser/scmHistory.ts:292-407` — `toISCMHistoryItemViewModelArray`. Closest open-source equivalent. Study lane assignment, color lookup, ref priority.
- `vscode/src/vs/workbench/contrib/scm/test/browser/scmHistory.test.ts` — their tests. Mine test cases.
- `vscode-git-graph/web/main.ts` — its rolling algo. Cross-check our `rolling`.

Read, understand, write fresh. Different state shape, different incremental contract.

## Done when

- All tests in `__tests__/` pass
- `gitlens-like` preset uses `gitlens-topo` end-to-end
- Real repo render visually matches GitLens screenshot intent (HEAD lane 0, ref colors stable, lanes reuse)
- Incremental compute holds: page 2+ doesn't recolor or reshuffle page 1
- `pnpm --filter web test` green
- Plan 5 unblocked (working-tree details, stashes, search)
