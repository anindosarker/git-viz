# Plan 6 — GitLens Parity Polish

Target = match or exceed GitLens visual quality. Current state lags badly: harsh saturated colors, no avatars in graph nodes, single-row top bar, no activity timeline, page jumps, harsh hover bg.

## Sub-plans

| # | Plan | Doc |
|---|------|-----|
| 6a | Token sweep + shadcn rebridge (colors, theme) | `.ai/plans/gitlens-parity-tokens/anindo-mac/tokens-plan.md` |
| 6b | TanStack react-table re-introduction (hybrid stack) | `.ai/plans/gitlens-parity-table/anindo-mac/table-plan.md` |
| 6c | Page jumps + virtualization perf fix | `.ai/plans/gitlens-parity-perf/anindo-mac/perf-plan.md` |
| 6d | Visual structure (2-row top bar, timeline, avatars-in-nodes, ref pill restyle) | `.ai/plans/gitlens-parity-visual/anindo-mac/visual-plan.md` |
| 6e | Animations (framer-motion, smooth transitions) | `.ai/plans/gitlens-parity-animations/anindo-mac/animations-plan.md` |

## Dev order

```
6a (foundation: colors via vscode tokens)
   ↓
6b + 6c (parallel: table reshuffle + perf fix)
   ↓
6d (visual structure on stable + fast base)
   ↓
6e (animations layer)
```

## Decisions locked

- **shadcn**: keep UI primitives. Drop bare `<Table>` (no virtualization). Hybrid: react-table column model + react-virtual rows + shadcn-styled cells + canvas graph overlay.
- **Packages**: already recent (React 19, Tailwind 4, react-table 8.21). No mass update needed — sub-plans bump specific items if blocked.
- **Color tokens**: full VS Code semantic token sweep. shadcn CSS vars bridged to vscode tokens. Standalone fallback = VS Code Dark+ defaults.
- **Animations**: framer-motion. Subtle: row mount fade (50ms), drawer slide (200ms), hover transition (100ms), modal fade.
- **Target reference**: GitLens screenshots in conversation. Closest OSS analog for renderer = vscode-scm-graph.

## Done when

- Side-by-side comparison ≈ GitLens (subjective, but ref pills muted, hover subtle, avatars in nodes, timeline at top, smooth scroll, no jumps)
- All quality gates green
- Browser smoke shows polished UI
