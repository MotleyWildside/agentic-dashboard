# Glossary

| Term | Meaning |
|---|---|
| **Agent** | An AI coding tool being monitored (Claude Code, Codex). One plugin each. |
| **AgentState** | The normalized per-agent data shape (`shared/types.ts`) — see [[normalized-agent-data]] |
| **Session / thread** | One agent conversation, parsed from one log file. Sub-agent threads nest under a parent via `parentThreadId`. |
| **Plugin** | A module in `server/plugins/` satisfying `AgentPlugin` — identity + collector + optional process matcher ([[plugin-system]]) |
| **Collector** | The agent-specific parser (`server/collectors/*`) that turns raw logs into `AgentState` |
| **Provider** | Synonym for plugin+collector viewed as a data source ([[agent-provider-contract]]) |
| **Snapshot** | The full dashboard state `{ updatedAt, agents[], processes }` rebuilt every poll and pushed over SSE |
| **Poll loop** | The 2 s cycle in `server/index.ts` that runs collectors and assembles the snapshot ([[data-flow]]) |
| **Provenance / sources** | Per-field label `real` / `inferred` / `manual`; absent = unavailable. The "never invent data" mechanism. |
| **Widget (instance)** | One card placed on the grid: `{ widgetId, pluginId, x, y, w, h }` ([[widget-system]]) |
| **Enablement (widget-derived)** | A plugin is polled iff it has ≥1 widget. There is no separate on/off switch. |
| **Dismissal** | User hiding a session from the dashboard (`dismissed.json`, 7-day TTL). Never deletes agent files. |
| **Theme pack** | A JSON theme definition ([[theme-json-schema]]) validated by `shared/theme-schema.ts` |
| **ThemeApi** | The persistence interface implemented by both Electron IPC and browser localStorage ([[theme-system]]) |
| **Statusline reporter** | `scripts/claude-statusline-reporter.js`, installed as the user's Claude Code statusline; side-channels real cost/limits into `~/.agent-dashboard/claude-state.json` |
| **Manual override** | `~/.agent-dashboard/manual.json` — hand-written field overrides, 24 h TTL, labelled `manual` |
| **Attention status** | `needs_input` / `waiting_approval` / `blocked` / `failed` — exempt from retention pruning |
| **Retention window** | `SESSION_RETENTION_S` (default 15 min): how long an idle session stays on the dashboard |
| **Type stripping** | Node ≥22.18 running `.ts` directly by erasing types — why `npm start` needs no build ([[runtime-boundaries]]) |
| **dist-server/** | tsc-compiled server+shared JS for Electron/packaged builds (gitignored) |
| **WikiLLM** | This knowledge base's operating model: raw sources → compiled wiki → maintenance schema ([../README.md](../README.md)) |
