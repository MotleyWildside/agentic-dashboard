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
  logo?: string;                           // inline SVG (no remote assets)
  layout?: Partial<PluginLayout>;          // widget sizing defaults/limits (grid units)
  matchProcess?: (cmd: string) => boolean; // optional `ps` matcher
  collect: (ctx: CollectContext) => Promise<AgentState>;
}
```

Field-by-field docs live in `server/plugins/_template.ts` (kept in sync with
the type). There is no separate manifest file or version field — the module
*is* the manifest; the repo's git history is the version.

## Lifecycle

1. **Discovery** (`server/plugins/registry.ts`, at import time): every
   `*.ts`/`*.js` file in the directory except `registry.*`, `_`-prefixed files,
   and `.d.ts` is dynamically imported.
2. **Validation**: missing/invalid default export (no `id`/`name`/`collect`) →
   warn + skip. Duplicate `id` → warn + skip. Module throws on import → warn +
   skip. **A broken plugin never prevents boot.**
3. **Enablement**: a plugin is *enabled* iff the user has ≥1 dashboard widget
   of it (`isEnabled` in `server/lib/store.ts`). Disabled plugins are not
   polled (their `matchProcess` still runs — process info is cheap and global).
4. **Collection**: each poll, `collect(ctx)` runs for enabled plugins in
   parallel. `ctx.isDismissed(sessionId)` filters user-hidden sessions.
5. **Failure isolation at runtime**: a rejected `collect()` becomes
   `errorAgentState(...)` — the agent card shows status `ERROR` with the
   message; other agents are unaffected. A throwing `matchProcess` is treated
   as no-match (`server/collectors/processes.ts`).

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
  (id, name, icon, logo, layout — never the collect function) and plugin *data*
  via the snapshot ([[data-flow]]).

## Related

[[agent-provider-contract]] · [[adding-a-plugin]] · [[extension-points]] ·
ADR-0003 (process matchers)
