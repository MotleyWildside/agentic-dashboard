# Agent Plugins

Agent Control discovers agents from `server/plugins/*.js`.

To add a new agent:

1. Copy `server/plugins/_template.js` to `server/plugins/<agent-id>.js`.
2. Export a default plugin with:
   - `id`: stable lowercase key, for settings and SSE events.
   - `name`: display name in the dashboard and Settings > Agents.
   - `icon`: fallback glyph.
   - `logo`: optional inline SVG.
   - `layout`: optional widget sizing defaults/limits in grid units:
     `{ minW, minH, defaultW, defaultH, maxW, maxH }`.
   - `collect(ctx)`: async collector returning an agent state.
3. Add a collector in `server/collectors/<agent-id>.js`.
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
