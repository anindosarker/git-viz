# Plan 6e — Animations (framer-motion)

## Goal

Subtle animation polish. Not flashy. GitLens-like smoothness.

## Install

`pnpm --filter web add framer-motion`

## Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Commit row mount (first appear) | Fade in opacity 0→1, translateY 4px→0 | 100ms ease-out |
| Row hover | bg-color transition | 100ms ease-out |
| Row select | bg-color + left-border slide-in | 150ms |
| Drawer open | slide up from bottom + fade | 200ms ease-out |
| Drawer close | reverse | 150ms ease-in |
| Modal open | fade backdrop + scale 0.95→1 | 150ms |
| Modal close | reverse | 100ms |
| Dropdown open | fade + scale 0.95→1 + translateY -4px→0 | 100ms |
| Tooltip show | fade + scale 0.9→1 | 80ms |
| Tooltip hide | fade | 80ms |
| Preset switch | crossfade table rows | 200ms |
| Filter clear | chip removal slide-out | 100ms |
| File diff hunk expand | height auto + opacity | 150ms |
| Sidebar tree expand | height + opacity | 100ms |
| Loading spinner | rotate 360deg infinite | 1s linear |
| Toast slide in | from bottom-right | 200ms |
| Toast slide out | to right | 150ms |

## Implementation

- Use `motion.div` with `initial` / `animate` / `exit` props
- Wrap virtualized rows with `AnimatePresence` for clean mount/unmount
- Drawer: `motion.aside` with `y` transform
- Modals: `motion.div` backdrop + `motion.div` content
- Replace CSS transitions with framer-motion where appropriate (consistent with React's render cycle)

## Files

- `web/src/components/Graph/CommitTableRow.tsx` — row mount fade
- `web/src/components/CommitDetails/CommitDetails.tsx` — drawer slide
- `web/src/components/Actions/*Modal.tsx` — modal fade+scale
- `web/src/components/Search/SearchBar.tsx` — filter chip slide
- `web/src/components/ui/dropdown-menu.tsx` — dropdown animation (or trust Radix's defaults; framer-motion override)
- `web/src/components/CommitList/CommitTooltip.tsx` — tooltip fade
- `web/src/components/Actions/ActionResultToast.tsx` — toast slide
- `web/src/components/PreferencesPanel/PreferencesPanel.tsx` — modal animation
- `web/src/components/Timeline/ActivityTimeline.tsx` (from 6d) — fade in on mount

## Restraint

NO bouncy spring physics. NO long durations. NO staggered cascades that scream "look at me". GitLens animations are barely-perceptible polish — match that.

## Done when

- Row mount feels smooth (no pop-in)
- Drawer opens/closes smoothly
- Modals don't flash
- Tooltips fade nicely
- Toasts slide cleanly
- No performance regression — 60fps maintained
