# Agent Entrypoint — read this first

You are an AI agent about to work on **Mimiron**: a local-first dashboard
(Node server + React frontend + optional Electron shell) that monitors AI coding
agents (Claude Code, Codex) by reading their local log files. It never invents data
and never sends anything off-machine.

## 60-second orientation

1. **Server** (`server/`): zero-dependency Node (≥22.18) TypeScript HTTP server. A poll loop
   calls each registered agent plugin's `collect()`, normalizes results into a
   snapshot, and streams it over SSE. Entry: `server/index.ts` (boots on import; runs uncompiled via Node type stripping).
2. **Plugins** (`server/plugins/*.ts`): one file per agent. Auto-discovered by
   `registry.ts`. Contract: `{ id, name, icon, logo?, layout?, matchProcess?, collect }`.
   See [wiki/agents/agent-provider-contract.md](wiki/agents/agent-provider-contract.md).
3. **Frontend** (`src/`): React 19 + MUI + react-grid-layout, built by Vite **into
   `public/`** (the built bundle is committed — rebuild with `npm run build` after
   frontend changes, or the served app stays stale!).
4. **Themes** (`themes/*.json`): JSON theme packs validated by
   `shared/theme-schema.ts`, adapted to MUI by `src/theme/themeAdapter.ts`.
5. **Persistence**: JSON files under `~/.agent-dashboard/` (settings, dismissed
   sessions) — see [wiki/settings/settings-and-persistence.md](wiki/settings/settings-and-persistence.md).

## Rules of the road

- **Never invent data.** Every displayed field is `real`, `inferred`, or `manual`
  (tracked in each agent state's `sources` map). Missing = `null`, shown as `—`.
- **Keep agent-specific logic out of core.** Anything claude/codex-specific belongs
  in `server/plugins/` + `server/collectors/`, not in `server/index.ts` or `src/ui/`.
- **Frontend changes require `npm run build`** before they're visible via `npm start`
  or Electron (only `npm run dev`'s Vite server hot-reloads).
- **Run `npm test`** (Node's built-in test runner, no deps) before finishing.
- **Update this wiki** when you change architecture, contracts, or persistence —
  rules in [schema.md](schema.md).

## Common tasks → recipes

| Task | Recipe |
|---|---|
| Add a new agent integration | [wiki/agents/adding-an-agent-provider.md](wiki/agents/adding-an-agent-provider.md) |
| Add a plugin (general) | [wiki/plugins/adding-a-plugin.md](wiki/plugins/adding-a-plugin.md) |
| Add a dashboard widget | [wiki/widgets/adding-a-widget.md](wiki/widgets/adding-a-widget.md) |
| Add a theme | [wiki/themes/adding-a-theme.md](wiki/themes/adding-a-theme.md) |
| Understand data flow | [wiki/architecture/data-flow.md](wiki/architecture/data-flow.md) |
| Dev/test/build commands | [wiki/development/commands.md](wiki/development/commands.md) |
| Known sharp edges | [wiki/risks/architectural-risks.md](wiki/risks/architectural-risks.md) |
