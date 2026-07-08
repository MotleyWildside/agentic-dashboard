# Agent Plugins

> Quick reference. The full architecture wiki lives in
> [knowledge-base/](knowledge-base/README.md) — see
> [adding-an-agent-provider](knowledge-base/wiki/agents/adding-an-agent-provider.md)
> for the complete recipe.

Mimiron discovers agents from `server/plugins/*.ts`.

To add a new agent:

1. Copy `server/plugins/_template.ts` to `server/plugins/<agent-id>.ts`.
2. Export a default plugin with:
   - `id`: stable lowercase key, for settings and SSE events.
   - `name`: display name in the dashboard and Settings > Agents.
   - `icon`: fallback glyph.
   - `logo`: optional inline SVG or local `/plugin-assets/...` image URL.
   - `layout`: optional widget sizing defaults/limits in grid units:
     `{ minW, minH, defaultW, defaultH, maxW, maxH }`.
   - `matchProcess(cmd)`: optional `ps` matcher for liveness detection.
   - `collect(ctx)`: async collector returning an agent state
     (`AgentState` in `shared/types.ts`).
3. Add a collector in `server/collectors/<agent-id>.ts`.
4. Restart the app.

The plugin automatically appears in the dashboard edit-mode add-widget dialog.
Dashboard widget instances are persisted in
`~/.agent-dashboard/settings.json` under `dashboard.widgets`.
Only plugin types with at least one widget instance are polled.

The renderer does not need code changes for new agents as long as the backend
plugin returns the existing agent/session state shape.

Session retention is handled by the backend. Idle sessions older than
`SESSION_RETENTION_S` are removed from the dashboard snapshot automatically.
The default is 900 seconds. Attention states such as `needs_input`,
`waiting_approval`, `blocked`, and `failed` stay visible even when older.
