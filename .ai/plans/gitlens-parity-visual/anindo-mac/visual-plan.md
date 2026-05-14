# Plan 6d — Visual Structure (Top Bar, Timeline, Avatars-in-Nodes, Ref Pills)

## Goal

Match GitLens visual structure. After 6a (tokens) and 6b/6c (table + perf) land.

## Items

### 1. 2-row top bar

Replace current single-row TopBar with two rows:

**Row 1 (breadcrumb):**
```
[repo-icon] <repo-name> > [git-icon] <branch> ▾ [target-icon] Fetch (Xm ago) ... [...] [pro-badge?]
```

**Row 2 (search):**
```
[branches-dropdown] [filter-icon] [sparkle-icon] [Search commits using natural language...] ... [No results | n results] [↑] [↓] [popout] [chart-icon]
```

Files:
- `web/src/components/TopBar/TopBar.tsx` — split into BreadcrumbRow + SearchRow
- `web/src/components/TopBar/BreadcrumbRow.tsx` (new)
- `web/src/components/TopBar/SearchRow.tsx` (new) — host SearchBar + filter chips + result nav

### 2. Activity timeline graph

Above the table. Shows commit density over time as a wave/line chart.

- Fetch last N commit dates (already in store)
- Bucket by month → count
- Render small SVG line chart (~40px tall, full width)
- Click on bucket → scroll to first commit in that range

File: `web/src/components/Timeline/ActivityTimeline.tsx` (new). Place in `App.tsx` above CommitTable.

### 3. Avatars-in-nodes

GitLens embeds author avatar inside graph node circle. Currently `hybrid-canvas-compact` already does this in our code per Plan 3 spec — verify implementation. If not actually rendering avatar via canvas `drawImage`:
- Load avatar URL (gravatar from `authorEmail` if no `authorAvatar`) → cache as HTMLImageElement
- Draw inside node circle with clip path
- Fallback to initials letter if image fails

File: `web/src/graph/render/primitives/node.ts` (update). `web/src/graph/avatars.ts` (new — gravatar URL builder, cache).

### 4. Ref pill restyle

GitLens style: muted single-tone background, monitor/tag icon prefix, rounded.

Update `web/src/components/Badges/RefBadge.tsx`:
- Background: `var(--vscode-badge-background)` (muted)
- Foreground: `var(--vscode-badge-foreground)`
- HEAD ref: distinguished bg `var(--vscode-charts-purple)` with lighter alpha
- Icon prefix: branch → `git-branch`, tag → `tag`, stash → `archive`, remote → `cloud`
- Border radius: 4px
- Padding: tight (2px 6px)
- Font: monospace 11px

### 5. Greyed merge commits

Detect via `commit.parents.length >= 2`. Render with `opacity: 0.6` + softer text color. GitLens does this for both subject and metadata.

Update `subject.column.tsx`, `author.column.tsx`, etc to read merge state + apply muted class.

### 6. Hover tooltip cards

Hovering author/avatar/hash → tooltip card with full commit info (subject, body preview, sha, file count). Uses existing `@radix-ui/react-tooltip`.

Files: `web/src/components/CommitList/CommitTooltip.tsx` (new). Wire into author + hash columns.

### 7. Natural-language search styling

Update `SearchBar.tsx`:
- Add sparkle icon (lucide `Sparkles`) before input
- Placeholder: "Search commits using natural language (↑↓ for history)"
- Right-aligned result count + ↑↓ nav arrows when results > 0
- Up/Down keys move selection to next/prev match

## Sequencing

1. 2-row top bar
2. Ref pill restyle
3. Greyed merge commits
4. Avatars-in-nodes (verify + complete)
5. Activity timeline
6. Hover tooltips
7. NL search styling

## Quality gates

- type-check, lint, build, test
- Side-by-side screenshot vs GitLens reference shows close visual match
- All existing functionality preserved

## Done when

- 2-row top bar matches GitLens layout
- Activity timeline renders above table
- Avatars visible inside graph node circles
- Ref pills muted with icons
- Merge commits visibly greyed
- Hover tooltips show on author/hash
- Search has sparkle + NL placeholder + ↑↓ nav
