# Plan 6a — Token Sweep + shadcn Rebridge

## Goal

All colors via VS Code semantic tokens. shadcn CSS vars bridged to those tokens. Desaturated palette. Standalone fallback = VS Code Dark+ defaults.

## Tokens to map

| Use | VS Code token | shadcn var |
|-----|---------------|------------|
| App background | `--vscode-editor-background` | `--background` |
| Foreground text | `--vscode-editor-foreground` | `--foreground` |
| Muted text | `--vscode-descriptionForeground` | `--muted-foreground` |
| Card bg | `--vscode-editorWidget-background` | `--card` |
| Border | `--vscode-widget-border` | `--border` |
| Input bg | `--vscode-input-background` | `--input` |
| Hover bg | `--vscode-list-hoverBackground` | (used directly) |
| Active row bg | `--vscode-list-activeSelectionBackground` | `--accent` |
| Focus ring | `--vscode-focusBorder` | `--ring` |
| Primary button | `--vscode-button-background` | `--primary` |
| Badge bg | `--vscode-badge-background` | (used directly) |
| Graph lanes | `--vscode-scmGraph-foreground{1-5}` | (graph colors) |
| Ref pills | `--vscode-charts-{blue,purple,green,orange,red,yellow}` | (ref colors) |
| Insertions | `--vscode-gitDecoration-addedResourceForeground` | (additions) |
| Deletions | `--vscode-gitDecoration-deletedResourceForeground` | (deletions) |
| Modified | `--vscode-gitDecoration-modifiedResourceForeground` | (modifications) |

## File touch list

- `web/src/index.css` — replace shadcn neutral-base color scheme with vscode token bridge
- `web/src/styles/theme.css` — expand `--gitviz-*` vars across all UI surfaces (not just graph)
- `web/src/graph/colors.ts` — desaturate fallback palette (use VS Code Dark+ chartsXxx values)
- `web/src/graph/columns/refs.column.tsx` + `RefBadge.tsx` — restyle pill to muted single-tone with icon prefix
- `web/src/components/CommitDetails/*` — replace hardcoded hex with tokens
- `web/src/components/Search/*` — replace
- `web/src/components/Actions/*` — replace
- `web/src/components/TopBar/TopBar.tsx` — replace
- `web/src/components/PreferencesPanel/PreferencesPanel.tsx` — replace
- `web/src/components/ui/*.tsx` — verify shadcn primitives use bridged vars

## VS Code Dark+ defaults (fallbacks for standalone)

```css
--vscode-editor-background: #1E1E1E
--vscode-editor-foreground: #CCCCCC
--vscode-descriptionForeground: #CCCCCCB3
--vscode-editorWidget-background: #252526
--vscode-widget-border: #313131
--vscode-list-hoverBackground: #2A2D2E
--vscode-list-activeSelectionBackground: #04395E
--vscode-focusBorder: #007FD4
--vscode-button-background: #0E639C
--vscode-button-foreground: #FFFFFF
--vscode-badge-background: #4D4D4D
--vscode-charts-blue: #3794FF
--vscode-charts-purple: #B180D7
--vscode-charts-green: #89D185
--vscode-charts-orange: #D18616
--vscode-charts-red: #F14C4C
--vscode-charts-yellow: #E5E510
--vscode-scmGraph-foreground1: #FFB000  (desaturate to #C5963F)
--vscode-scmGraph-foreground2: #DC267F  (desat to #B85586)
--vscode-scmGraph-foreground3: #994F00  (keep)
--vscode-scmGraph-foreground4: #40B0A6  (keep)
--vscode-scmGraph-foreground5: #B66DFF  (desat to #9B6BD0)
```

## Hover/selection states

- Default row: no bg
- Hover: `--vscode-list-hoverBackground` (already subtle in VS Code)
- Selected: `--vscode-list-activeSelectionBackground` (subtle blue overlay)
- Selected + focused: add 2px left border `--vscode-focusBorder`

## Sequencing

1. **Bridge file**: rewrite `web/src/index.css` `@theme` block with full token bridge.
2. **Palette desaturate**: update `web/src/graph/colors.ts` fallback hex.
3. **Sweep components**: grep all `#xxx` / hardcoded color literals in `web/src/`, replace with tokens.
4. **Build + visual check**: standalone server + agent-browser screenshot. Compare to GitLens reference.
5. **Quality gates**: type-check, lint, build, test.

## Done when

- `grep -rE '#[0-9a-fA-F]{3,8}' web/src/ --include='*.{ts,tsx,css}'` shows only theme.css/index.css fallbacks
- All UI surfaces respond to VS Code theme change live (already wired in 5a)
- Standalone palette matches VS Code Dark+
- Hover/selection no longer harsh
