# Plan 5a — UX Shell

## Goal

Build the home for the extension: activity bar entry, sidebar view, status bar, settings, theme integration, state persistence. Everything else (5b–5e) plugs into this shell.

## Non-goals

- Commit details panel (5b)
- Search / filter UI (5c)
- Git write actions (5d)
- Multi-repo (5e)
- Graph rendering itself (Plans 3–4)

## Decisions locked

- Activity bar icon → custom view container with sidebar tree view
- Status bar item gets wired (`src/StatusBarItem.ts` exists, unused)
- Settings UI = native VS Code settings JSON + a webview-side preferences panel for power options
- Theme tokens drive all colors (canvas + DOM) via CSS variables
- Webview persistence via `panel.webview.state` API for selection/scroll/preset
- Activation events trimmed (drop `"*"`, scope to git repos)

## Shell pieces

### Activity bar + view container

`package.json` contributes:

```json
"contributes": {
  "viewsContainers": {
    "activitybar": [
      {
        "id": "git-viz",
        "title": "Git Viz",
        "icon": "icon.png"
      }
    ]
  },
  "views": {
    "git-viz": [
      {
        "id": "git-viz.repoTree",
        "name": "Repositories",
        "icon": "icon.png",
        "contextualTitle": "Git Viz"
      }
    ]
  },
  "commands": [
    { "command": "git-viz.showCommitGraph", "title": "Show Commit Graph", "category": "GitViz" },
    { "command": "git-viz.openSettings", "title": "Open Settings", "category": "GitViz" },
    { "command": "git-viz.refresh", "title": "Refresh", "category": "GitViz", "icon": "$(refresh)" }
  ],
  "menus": {
    "view/title": [
      { "command": "git-viz.refresh", "when": "view == git-viz.repoTree", "group": "navigation" }
    ]
  }
}
```

Activation events:

```json
"activationEvents": [
  "onView:git-viz.repoTree",
  "onCommand:git-viz.showCommitGraph",
  "workspaceContains:**/.git"
]
```

Drops the `"*"` everywhere-activation. Faster startup. Still activates when user has a git repo open.

### Sidebar tree view

`src/views/RepoTreeProvider.ts` (new) implements `vscode.TreeDataProvider`. Root nodes per workspace folder that's a git repo. Children groups:

```
📁 git-viz (repo)
├── 📍 HEAD: master
├── 🌿 Branches (3)
│   ├── master (current)
│   ├── antigravity/menu
│   └── new
├── 🏷️ Tags (1)
│   └── v0.0.1
├── 💾 Stashes (0)
└── 🔗 Remotes (1)
    └── origin
```

Each node has `command: 'git-viz.showCommitGraph'` with the ref as arg to open the graph filtered to that ref. Tree backed by Plan 1's `refs:getAll`. Refresh on file watcher events (5e).

### Status bar

Rewire `src/StatusBarItem.ts`:

```
[$(git-branch) master ↑2 ↓0]   ← click → opens graph
```

Subscribes to repo state changes (poll via `getRepoInfo` every 5s, or hook into 5e's watcher). Shows:
- Current branch name (or short hash if detached)
- Ahead/behind counts vs upstream
- `$(git-branch)` codicon

Click action: `git-viz.showCommitGraph`.

### Settings

Two layers:

**1. VS Code settings (`package.json` `contributes.configuration`)**

```json
"configuration": {
  "title": "Git Viz",
  "properties": {
    "git-viz.graphStyle": {
      "type": "string",
      "enum": ["gitlens-like", "git-graph-like", "vscode-scm-graph-like"],
      "default": "gitlens-like",
      "description": "Visual preset for the commit graph"
    },
    "git-viz.refDisplay": {
      "type": "string",
      "enum": ["inline", "left-column", "right-column"],
      "default": "left-column"
    },
    "git-viz.rowHeight": { "type": "number", "default": 24 },
    "git-viz.pageSize": { "type": "number", "default": 500 },
    "git-viz.topoOrder": { "type": "boolean", "default": true },
    "git-viz.dateFormat": {
      "type": "string",
      "enum": ["relative", "absolute", "iso"],
      "default": "relative"
    },
    "git-viz.showWorkingTree": { "type": "boolean", "default": true },
    "git-viz.columns": {
      "type": "array",
      "description": "Visible columns and order"
    }
  }
}
```

Extension reads `vscode.workspace.getConfiguration('git-viz')` on activation + on `onDidChangeConfiguration`. Pushes config into webview via new message `config:update`.

**2. Webview preferences panel** (for power options not surfaced in VS Code settings)

Gear icon in TopBar → opens modal in webview. Columns drag-reorder, custom palette tweaks, etc. Writes back to VS Code settings via `config:set` message.

Standalone mode reads/writes config to `~/.git-viz/config.json` instead.

### Theme integration

Canvas + DOM share palette via CSS vars:

```css
/* web/src/styles/theme.css */
:root {
  --gitviz-graph-lane-1: var(--vscode-scmGraph-foreground1, #FFB000);
  --gitviz-graph-lane-2: var(--vscode-scmGraph-foreground2, #DC267F);
  /* ... */
  --gitviz-graph-head: var(--vscode-textLink-foreground, #3794FF);
  --gitviz-graph-row-bg: var(--vscode-list-hoverBackground);
  --gitviz-graph-row-selected: var(--vscode-list-activeSelectionBackground);
}
```

Canvas renderers read CSS vars via `getComputedStyle(document.documentElement)`. Re-read on `vscode-color-theme-changed` event (extension posts message to webview).

Standalone mode: fallback hardcoded colors, dark theme default, light toggle in preferences panel.

### Webview state persistence

VS Code webview API:

```ts
const state = panel.webview.getState() ?? { selectedHash: null, scrollY: 0, presetId: 'gitlens-like' };
// ... on change:
panel.webview.setState({ selectedHash, scrollY, presetId });
```

Webview hydrates Zustand store from `getState()` on mount. Persists slice subset (selection, scroll, preset, column config) to `setState()` on change. Survives webview reload.

Standalone mode: localStorage equivalent. Same store hydration logic.

### Keyboard shortcuts

```json
"keybindings": [
  { "command": "git-viz.showCommitGraph", "key": "ctrl+shift+g ctrl+shift+v", "mac": "cmd+shift+g cmd+shift+v" },
  { "command": "git-viz.refresh", "key": "f5", "when": "activeWebviewPanelId == git-viz.commitGraph" }
]
```

Inside webview (handled by React):

| Key | Action |
| --- | ------ |
| j / ↓ | Next commit |
| k / ↑ | Prev commit |
| Enter | Open commit details |
| Esc | Close details |
| / | Focus search (5c) |
| g g | Top |
| G | Bottom |

`web/src/hooks/useKeyboardNav.ts` (new) wires up. Lives in `web/src/state/store.ts` selection slice.

## File layout

```
src/
├── extension.ts                       # updated activation
├── views/
│   ├── RepoTreeProvider.ts            # NEW
│   └── treeItems.ts                   # NEW
├── statusBar/
│   └── StatusBarItem.ts               # moved from src/, rewired
├── settings/
│   └── ConfigBridge.ts                # NEW: vscode config ↔ webview
└── panels/
    └── (existing handler registry from Plan 2)

web/src/
├── styles/
│   └── theme.css                      # NEW
├── components/
│   ├── PreferencesPanel/
│   │   └── PreferencesPanel.tsx       # NEW
│   └── TopBar/
│       └── TopBar.tsx                 # updated: gear icon, preset dropdown
├── hooks/
│   └── useKeyboardNav.ts              # NEW
└── state/
    └── persist.ts                     # NEW: vscode state + localStorage adapter
```

## Sequencing

1. **5a-1**: `package.json` contributions — viewsContainers, views, commands, configuration, keybindings, activationEvents trim. Plus extension.ts updated to register tree provider + status bar.
2. **5a-2**: `RepoTreeProvider` skeleton — empty root, refresh command works. Wire to `refs:getAll`.
3. **5a-3**: Status bar item live with branch name (poll every 5s for now; replace with watcher in 5e).
4. **5a-4**: `ConfigBridge` — extension reads config + pushes `config:update` to webview. Webview store consumes.
5. **5a-5**: Theme CSS vars set up. Canvas renderer reads them. Light/dark switch in standalone.
6. **5a-6**: Webview state persistence — Zustand persist middleware backed by `webview.getState/setState`.
7. **5a-7**: Preferences panel modal — column reorder, ref display switch, date format. Round-trips to VS Code config.
8. **5a-8**: Keyboard nav hook + bindings.
9. **5a-9**: End-to-end: open extension, click tree item, graph opens, switch preset via dropdown, reload window, state restored.

## Risks

- VS Code TreeDataProvider refresh latency on huge ref lists. Mitigate: lazy-expand children, only fetch refs once.
- Settings round-trip lag (extension ↔ webview). Mitigate: optimistic UI update + reconcile on echo.
- Canvas needs to re-read CSS vars on theme change. VS Code emits `vscode.window.onDidChangeActiveColorTheme`. Hook there.
- Standalone has no `vscode.workspace.getConfiguration`. Mitigate: `ConfigBridge` is abstracted; backend picks store at runtime.

## Reference repos

- `.ai/reference/vscode-git-graph/src/extension.ts` — activation patterns
- `.ai/reference/vscode-git-graph/src/statusBarItem.ts`
- `.ai/reference/vscode/extensions/git/src/decorationProvider.ts` — tree decoration patterns
- `.ai/reference/vscode/extensions/git/src/historyProvider.ts` — SCM provider integration (look only; we don't go SCM-route)

## Done when

- Activity bar shows Git Viz icon, opens sidebar
- Tree view lists branches/tags/stashes from current repo
- Clicking ref opens graph filtered to it
- Status bar shows current branch + ahead/behind, clickable
- All settings keys in `git-viz.*` work; changing one updates webview live
- Theme switch (light/dark) repaints canvas + DOM correctly
- Reload window → graph reopens at last selection + scroll + preset
- Keyboard: j/k/Enter/Esc/// work in webview
- No `"*"` activation event; extension still activates on git workspaces
