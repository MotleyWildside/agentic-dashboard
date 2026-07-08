# Plugin System

Agent integrations are plugins: self-contained modules discovered from
`server/plugins/` at boot. The core never hardcodes the agent set — the
registry, poll loop, API, and UI all iterate whatever is registered.

## Why this exists

Before the plugin boundary, adding an agent meant touching the poll loop, the
API, the process scanner, and the UI. Now it's one plugin file + one collector
file ([[adding-an-agent-provider]]).

## Manifest (the contract)

A plugin is a module whose **default export** satisfies `AgentPlugin`
(`shared/types.ts`):

```ts
interface AgentPlugin {
  id: string;                              // unique, url-safe; used in settings, SSE, dismissals
  name: string;                            // display name
  icon: string;                            // glyph fallback
  logo?: string;                           // inline SVG or /plugin-assets/... image URL; no remote assets
  layout?: Partial<PluginLayout>;          // widget sizing defaults/limits (grid units)
  matchProcess?: (cmd: string) => boolean; // optional `ps` matcher
  widgetType?: string;                     // renderer key; omit ⇒ 'agent-card' (ADR-0006)
  collect?: (ctx: CollectContext) => Promise<AgentState>;      // agent-card data path
  collectData?: (ctx: CollectContext) => Promise<unknown>;     // custom-widget opaque payload
}
```

A plugin provides **at least one** of `collect` / `collectData`. The common
case (an agent integration) uses `collect`; a custom widget sets `widgetType`
and provides `collectData` whose payload lands in `Snapshot.widgetData[id]` and
is drawn by a frontend renderer ([[widget-system]], ADR-0006).

Field-by-field docs live in `server/plugins/_template.ts` (kept in sync with
the type). There is no separate manifest file or version field — the module
*is* the manifest; the repo's git history is the version.

## Lifecycle

1. **Discovery** (`server/plugins/registry.ts`, at import time): every
   `*.ts`/`*.js` file in the directory except `registry.*`, `_`-prefixed files,
   and `.d.ts` is dynamically imported.
2. **Validation**: missing/invalid default export (no `id`/`name`, or neither
   `collect` nor `collectData`) → warn + skip. Duplicate `id` → warn + skip.
   Module throws on import → warn + skip. **A broken plugin never prevents boot.**
3. **Enablement**: a plugin is *enabled* iff the user has ≥1 dashboard widget
   of it (`isEnabled` in `server/lib/store.ts`). Disabled plugins are not
   polled (their `matchProcess` still runs — process info is cheap and global).
4. **Collection**: each poll, enabled plugins run in parallel — `collect(ctx)`
   for agent-card plugins (result → `snapshot.agents`), `collectData(ctx)` for
   custom-widget plugins (result → `snapshot.widgetData[id]`, via
   `collectWidgetData` in `server/lib/collect.ts`). `ctx.isDismissed(sessionId)`
   filters user-hidden sessions.
5. **Failure isolation at runtime**: a rejected `collect()` becomes
   `errorAgentState(...)` — the agent card shows status `ERROR` with the
   message; a rejected `collectData()` becomes a `null` payload (logged). Other
   plugins are unaffected. A throwing `matchProcess` is treated as no-match
   (`server/collectors/processes.ts`).

## What plugins can and cannot access

- Plugins are ordinary server modules — they run **with full server
  privileges** (fs, child_process). There is no sandbox. This is why the
  registry only loads from the repo's own `server/plugins/` directory and not
  from a user-writable path: installing a plugin = a code change you review.
- By convention plugins read only their agent's log/state files and never
  write outside `~/.agent-dashboard/`.
- Plugins must not import each other, the registry, or `server/index.ts`.

## Plugin settings & data to the UI

- Persisted plugin-related state is limited to widget instances
  (`settings.json → dashboard.widgets[]`, keyed by `pluginId`) and dismissed
  sessions (`dismissed.json`, keyed `"<pluginId>:<sessionId>"`). See
  [[settings-and-persistence]]. There is no per-plugin settings schema yet —
  add one deliberately (ADR) if a plugin ever needs config beyond env vars.
- The UI receives plugin *metadata* via `GET /api/config` → `pluginMeta()`
  (id, name, icon, logo, layout, widgetType — never the collect/collectData
  functions) and plugin *data* via the snapshot: agent state in
  `snapshot.agents`, custom-widget payloads in `snapshot.widgetData`
  ([[data-flow]]).

## Related

[[agent-provider-contract]] · [[adding-a-plugin]] · [[extension-points]] ·
ADR-0003 (process matchers)
