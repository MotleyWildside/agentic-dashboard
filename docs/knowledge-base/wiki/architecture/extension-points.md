# Extension Points

Every supported way to extend the dashboard without touching core code, ranked
by how often you'll need them.

| # | Extension | How | Docs |
|---|---|---|---|
| 1 | **New agent integration** | Drop one plugin file in `server/plugins/` + a collector in `server/collectors/` | [[adding-an-agent-provider]] |
| 2 | **New dashboard widget instance** | UI edit mode → Add widget (persisted, no code) | [[widget-system]] |
| 3 | **New theme** | New JSON file in `themes/` (built-in) or import via Settings (custom) | [[adding-a-theme]] |
| 4 | **Process detection for an agent** | `matchProcess(cmd)` on the plugin | [[agent-provider-contract]] |
| 5 | **Manual data overrides** | `~/.agent-dashboard/manual.json` (24 h TTL), labelled `manual` | `server/collectors/manual.ts` |
| 6 | **Agent-side reporters** | Write `~/.agent-dashboard/<agent>-state.json`; the agent's collector overlays it (e.g. Claude statusline reporter) | [[data-flow]] |
| 7 | **Config knobs** | Env vars / `.env` (`PORT`, `POLL_MS`, `*_DIR`, `RUNNING_THRESHOLD_S`, `SESSION_RETENTION_S`) | `server/config.ts`, `.env.example` |
| 8 | **New agent status** | Add to `AgentStatus` union (`shared/types.ts`) + `STATUS_PRIORITY` (`server/lib/state.ts`) + `statusLabel`/`statusColor` mapping (`src/ui/lib/status.ts`) | [[normalized-agent-data]] |
| 9 | **New API endpoint** | Route in `server/index.ts`; validation logic as a pure function in `server/lib/` so it's testable | [[testing]] |

## What is NOT an extension point yet (do not pretend otherwise)

- **Custom widget renderers per plugin.** Every widget renders the same
  `AgentCard` component; a plugin can influence it only via metadata
  (name/icon/logo/layout) and its normalized data. Shipping a plugin-specific
  React component would require a frontend registry + rebuild. Tracked in
  [[architectural-risks]].
- **Plugins from outside `server/plugins/`.** The registry scans only its own
  directory; there is no user-level plugin dir (`~/.agent-dashboard/plugins`)
  yet. Deliberate: plugins run with full server privileges, so installing them
  means editing the repo. See [[plugin-system]] § security.
- **Actions on agents** (resume session, open repo, …). The dashboard is
  read-only by design except for its own settings/dismissals. An action system
  would need explicit user consent paths — record an ADR before adding one.

## Design rule for new extension points

Core provides the *mechanism* (registry, validation, lifecycle, failure
isolation); the extension provides only *data + behavior behind a documented
contract* (typed in `shared/types.ts`). If a proposed feature requires core to
know a specific agent's name, it's shaped wrong.
