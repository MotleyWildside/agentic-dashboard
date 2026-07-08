# Module Map

Every module, its responsibility, and what it may depend on. "Depends on" is a
boundary rule, not just an observation — new code should respect it.

## shared/ — the contract layer

| File | Responsibility | Depends on |
|---|---|---|
| `shared/types.ts` | All domain types: `AgentState`, `AgentSession`, `Snapshot`, `AgentPlugin`, `PluginMeta`, `WidgetInstance`, `Settings`, `ThemePack`, `ThemeApi`… | nothing |
| `shared/theme-schema.ts` | Theme pack validation (`validateThemePack`), `DEFAULT_THEME_ID` | nothing |

Shared modules must stay dependency-free — they are imported by the server,
the frontend, and (compiled) the Electron main process.

## server/ — data collection & API

| File | Responsibility | Depends on |
|---|---|---|
| `server/index.ts` | HTTP server, SSE, poll loop, event feed, graceful shutdown. **Boots on import**; exports `ready` | everything below |
| `server/config.ts` | Env/.env configuration (`PORT`, `POLL_MS`, log dirs…) | node builtins |
| `server/lib/state.ts` | Normalized-state helpers: `emptyAgentState`, `worstStatus`, `pruneInactiveSessions`, `aggregateFromSessions`, `errorAgentState` | shared/types |
| `server/lib/files.ts` | JSONL tail/head readers, `readJsonSync` with freshness, mtime helpers | node builtins |
| `server/lib/store.ts` | Persisted user state under `~/.agent-dashboard/` (settings, dismissed), atomic writes, `isEnabled` | config, files |
| `server/lib/dashboard.ts` | Pure validation/normalization of widget layouts for POST /api/settings | shared/types |
| `server/plugins/registry.ts` | Scans its own dir for `*.ts`/`*.js` plugin files, validates the contract, exposes `plugins` + `pluginMeta()`; `loadPluginsFrom(dir)` for tests | shared/types |
| `server/plugins/claude.ts`, `codex.ts` | Plugin manifests: identity, logo, `matchProcess`, wire to collector | collectors |
| `server/plugins/_template.ts` | Documented template for new agent plugins | — |
| `server/collectors/claude.ts` | Parses Claude Code JSONL transcripts (+ statusline reporter overlay) into `AgentState` | config, lib/files, lib/state |
| `server/collectors/codex.ts` | Parses Codex rollout logs into `AgentState` | config, lib/files, lib/state |
| `server/collectors/processes.ts` | `ps` scan against plugins' `matchProcess` predicates | shared/types |
| `server/collectors/manual.ts` | `~/.agent-dashboard/manual.json` overrides, labelled `manual` | config, lib/files |

Rule: **collectors never import the registry or index**; plugins import only
their collector + shared types; `index.ts` is the only module allowed to wire
everything together.

## src/ — frontend (built into public/)

| File | Responsibility |
|---|---|
| `src/main.tsx` | React root; theme state; browser ThemeApi (localStorage) vs `window.agentThemes` (Electron) |
| `src/ui/App.tsx` | Composition root only: wires hooks into `TopBar`, `DashboardGrid`, dialogs |
| `src/ui/TopBar.tsx` | Header: running count, clock, connection dot, edit/settings buttons |
| `src/ui/types.ts` | UI-facing types: `ThemeState`, `PluginInfo`, `CardAgent` |
| `src/ui/lib/` | Pure logic, no React (unit-tested): `format.ts` (fmtNum/fmtAgo/shortPath…), `status.ts` (statusLabel/statusColor), `sessions.ts` (buildSessionRows…) |
| `src/ui/components/` | Reusable presentational primitives: `StatusBadge`, `MetricChip`, `PromptLabel`, `ProgressBar`, `PluginLogo` |
| `src/ui/hooks/` | Shared state hooks: `useSnapshot` (SSE), `useAgentConfig` (plugins+settings), `useCompact` (breakpoints) |
| `src/ui/agent-card/` | The agent widget renderer: `AgentCard`, `TaskRow`, `AgentLimits`, `AgentIcon` |
| `src/ui/dashboard/` | Widget grid feature: `layout.ts` (pure geometry, unit-tested), `useDashboard` (optimistic save cycle), `DashboardGrid`, `EditControls`, `AddWidgetDialog` |
| `src/ui/settings/SettingsDialog.tsx` | Theme selection / import / export dialog |
| `src/data/api.ts` | API client: `subscribeSnapshot` (fetch + SSE + connection state), `loadAgentConfig`, `saveDashboardSettings`; dev-only mock gating |
| `src/data/mockAgents.ts` | Design-time mock snapshot (dev builds only) |
| `src/theme/themeAdapter.ts` | Theme pack normalization (merge onto default), `createMuiThemeFromPack` → MUI theme + `theme.dashboard` tokens |
| `src/theme/mui-theme.d.ts` | Module augmentation: adds the custom `dashboard` token bag to MUI's `Theme`/`ThemeOptions` types (plus small MUI v9 prop-typing shims) |

Rule: the frontend consumes **only** the HTTP API and shared types — it never
reads agent logs or knows agent-specific formats.

Internal layering (feature-based): `lib/` is pure and React-free;
`components/` are stateless primitives; feature directories
(`dashboard/`, `agent-card/`, `settings/`) own their components + hooks;
`App.tsx` only composes. New UI code goes into the feature directory it
belongs to, pure logic goes into `lib/` (or the feature's `layout.ts`-style
module) so it stays unit-testable.

## electron/ — optional desktop shell (plain CJS on purpose)

| File | Responsibility |
|---|---|
| `electron/main.cjs` | Boots the compiled server (`dist-server/server/index.js`), creates the window, owns file-based theme persistence over IPC (`themes:*` channels) |
| `electron/preload.cjs` | Exposes `window.agentThemes` (ThemeApi) via contextBridge |
| `electron/launch.cjs` | Spawns Electron stripped of `ELECTRON_RUN_AS_NODE` |

These stay CommonJS JavaScript: Electron's main process can't type-strip `.ts`,
and the files are thin. They consume compiled TS via `dist-server/`
(see [[runtime-boundaries]] and ADR-0004).

## Everything else

| Path | What |
|---|---|
| `themes/*.json` | Built-in theme packs ([[theme-json-schema]]) |
| `public/` | **Vite build output**, committed so `npm start` works without a build step. Regenerate with `npm run build` |
| `dist-server/` | tsc output of server+shared for Electron; gitignored; regenerate with `npm run build:server` |
| `scripts/scan.ts` | One-shot collector run (`npm run scan`) |
| `scripts/claude-statusline-reporter.js` | User-installed Claude Code statusline command; **stays JS** — its absolute path is baked into users' `~/.claude/settings.json` |
| `test/` | `node:test` suite + plugin fixtures ([[testing]]) |
| `docs/knowledge-base/` | This wiki |
