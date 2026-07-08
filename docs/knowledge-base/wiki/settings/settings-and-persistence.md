# Settings & Persistence

Every persisted file, its owner, format, and lifecycle. Principle: **one
writer per file**; small JSON; atomic writes (tmp + rename) for anything the
dashboard owns.

## Dashboard-owned (written by the server via `server/lib/store.ts`)

### `~/.agent-dashboard/settings.json`

```jsonc
{
  "plugins": { "claude": { "enabled": true } },   // LEGACY — written, never read
  "dashboard": {
    "widgets": [ { "widgetId": "…", "pluginId": "claude", "x": 0, "y": 0, "w": 6, "h": 5 } ]
  }
}
```

- `dashboard.widgets` is the real state: the widget grid, and **the** source
  of plugin enablement (`isEnabled` = plugin has ≥1 widget).
- `plugins.{id}.enabled` is legacy: `POST /api/settings { plugins }` still
  accepts and stores it for old clients, but nothing reads it. `GET
  /api/settings` returns a *derived* `plugins` map computed from widgets.
- All writes flow through `POST /api/settings` with validation
  (`server/lib/dashboard.ts`) — hand-edited invalid entries are also tolerated:
  `loadSettings()` falls back to a safe empty shape.

### `~/.agent-dashboard/dismissed.json`

`{ "<pluginId>:<sessionId>": "<ISO date>" }` — sessions the user hid.
Pruned to a 7-day TTL on every save. Dismissing never touches transcripts.

## Agent/reporter-owned (dashboard only READS these, with freshness limits)

| File | Writer | Read by | Trusted for |
|---|---|---|---|
| `~/.agent-dashboard/claude-state.json` | `scripts/claude-statusline-reporter.js` (user-installed Claude statusline) | claude collector | 2 min |
| `~/.agent-dashboard/codex-state.json` | user wrapper scripts / future hooks | codex collector | 10 min |
| `~/.agent-dashboard/manual.json` | the user, by hand | `applyManualOverrides` (all agents) | 24 h |
| `~/.claude/projects/**`, `~/.codex/sessions/**` | the agents themselves | collectors | `SESSION_RETENTION_S` |

Staleness limits exist because an outdated override is worse than none.

## Theme persistence (two backends, same `ThemeApi`)

| Backend | Selected theme | Custom themes |
|---|---|---|
| Electron (`electron/main.cjs`) | `<userData>/theme-settings.json` | `<userData>/themes/*.json` |
| Browser (`src/main.tsx`) | localStorage `agent-control.selectedThemeId` | localStorage `agent-control.customThemes` |

Not synchronized with each other — see [[architectural-risks]].

## Runtime configuration (not persisted — env / `.env`)

`server/config.ts`, template in `.env.example`: `HOST`, `PORT`, `POLL_MS`,
`CLAUDE_PROJECTS_DIR`, `CODEX_SESSIONS_DIR`, `AGENT_DASHBOARD_DIR`,
`RUNNING_THRESHOLD_S`, `SESSION_RETENTION_S`. `.env` is read from the process
cwd in dev; packaged Electron builds use defaults + real env vars only.

## How to safely change this

- New persisted dashboard state → a load/save pair in `server/lib/store.ts`
  (atomic write, safe-default load), a typed shape in `shared/types.ts`, and a
  row here.
- Never change the meaning of an existing key — add a new one and migrate on
  load if needed (old files must keep working; users don't reinstall state).
