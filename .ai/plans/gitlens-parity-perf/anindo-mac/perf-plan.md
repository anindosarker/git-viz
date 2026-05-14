# Plan 6c — Page Jumps + Virtualization Perf

## Symptom

User reports: "page jumps. probably perf issue. doesn't load well"

## Suspects

1. **`@tanstack/react-virtual` `estimateSize`** returns wrong default → row heights mis-estimated → scroll jumps when actual heights measured
2. **Canvas overlay re-rasterizes** on every scroll → layout shift
3. **Bootstrap fires multiple store updates** → re-renders → virtual list reset
4. **Missing `overscan`** → blank rows during fast scroll
5. **`measureElement` callback** firing late → height adjustment after paint → jump

## Investigation steps

1. Open standalone server, agent-browser, scroll the commit list, take screenshots over 1s interval.
2. React DevTools Profiler — measure render count during scroll.
3. Browser DevTools Performance — flame chart during scroll. Look for layout/paint storms.
4. Console: log row mount/unmount + virtualizer state changes during scroll.

## Likely fixes

- Increase `estimateSize` to closest realistic value (e.g., 28 instead of 24)
- Add `overscan: 10` to virtualizer
- `measureElement` only on rows that haven't been measured (track set of measured indices)
- Canvas: only redraw on `commits[]` change or visible range change, NOT on every scroll tick
- Use `requestAnimationFrame` to batch canvas redraws
- Bootstrap: dedupe store updates with `if (state.commits.length === 0)` check

## Other perf wins

- Pre-fetch next page when 50 rows from bottom (already implied by Plan 3) — verify implemented
- Cache joined `CommitRow[]` per page — `useGraph` shouldn't re-join on every render
- Memo column cell renders (heavy in `subject.column.tsx` with markdown — actually subject is plain text; double check)

## Files likely touched

- `web/src/components/Graph/CommitTable.tsx`
- `web/src/components/Graph/CommitGraph.tsx` (canvas-overlay logic)
- `web/src/graph/render/hybrid-canvas-*.tsx`
- `web/src/hooks/useGit.ts` (bootstrap dedup)
- `web/src/hooks/useGraph.ts` (memoize)

## Quality gates

- type-check, lint, build, test
- Visual: scroll smooth at 60fps in agent-browser screenshot diff
- React Profiler: < 10 renders per scroll tick

## Done when

- No visible row-height jumps during scroll
- Canvas overlay stays aligned during scroll
- Bootstrap doesn't cause flicker
- Fast scroll doesn't reveal blank rows
