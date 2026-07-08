# ADR-0006 — Plugin-defined widget renderers (custom widget types)

**Status**: accepted (2026-07-08)

## Context

Today the dashboard is extensible on the **data** axis but not on the
**presentation** axis:

- Every plugin maps into one normalized `AgentState` (`shared/types.ts`) and is
  rendered by the single `AgentCard` component. `WidgetInstance.pluginId`
  selects a *data source*, not a *renderer*
  ([[widget-system]], `src/ui/dashboard/DashboardGrid.tsx`).
- This is already recorded as a non-extension-point in
  [[extension-points]] ("Custom widget renderers per plugin") and
  [[architectural-risks]], with the note: *"would require a frontend registry +
  rebuild — open an ADR before building it."* This ADR is that step.

A plugin author who wants to show something that is **not an agent-with-sessions**
— a token-cost timeline chart, a raw log stream, an account/quota table — has no
seam to plug into. They must either distort their data into `AgentState`
(violating the "never invent data" invariant) or fork core UI. Both are wrong.

The constraint that shapes every option: the frontend is compiled by Vite into a
**committed `public/` bundle** ([[runtime-boundaries]], [[commands]]). There is
no runtime code-loading path for UI, and adding one would break the security
model ([[plugin-system]] § "What plugins can and cannot access": plugins run with
full privileges, so they load only from the reviewed repo, never a user dir).
Therefore any renderer extension point is **compile-time** (a registry in `src/`,
shipped in the bundle), not a runtime marketplace. That is a deliberate boundary,
not a limitation to remove.

## Decision

Introduce a **widget-type + frontend renderer registry**, mirroring on the client
the plugin registry the server already has. Three coordinated pieces:

1. **Manifest gains `widgetType?: string`** (default `'agent-card'`) in
   `AgentPlugin` (`shared/types.ts`) and is surfaced through `PluginMeta` /
   `pluginMeta()` (`server/plugins/registry.ts`) so the UI can pick a renderer.
   Absent field ⇒ `'agent-card'` ⇒ identical behavior to today.

2. **A generic per-plugin data channel** on the snapshot for non-agent widgets,
   kept *parallel* to `agents[]` so agent-card semantics (status aggregation,
   provenance, retention) are untouched:

   ```ts
   interface Snapshot {
     updatedAt: string | null;
     agents: AgentState[];                          // unchanged
     processes: Record<string, ProcessInfo> | null; // unchanged
     widgetData?: Record<string, unknown> | null;   // new: pluginId -> plugin-owned payload
   }
   ```

   `agent-card` plugins keep returning `AgentState` from `collect()` exactly as
   today. A custom-type plugin instead implements an optional
   `collectData(ctx): Promise<unknown>` whose result lands under
   `widgetData[pluginId]`. The plugin owns and validates its own payload shape;
   core treats it as opaque JSON and never interprets it.

3. **A frontend renderer registry** in `src/ui/widgets/` —
   `Record<widgetType, React.ComponentType<WidgetRendererProps>>`
   (`registry.tsx`) — replacing the hardcoded `<AgentCard>` in
   `DashboardGrid.tsx`. `'agent-card'` is the built-in default entry (an adapter
   over `AgentCard`). `DashboardGrid` looks up the plugin's `widgetType` via the
   pure `resolveWidgetType` (`resolve.ts`), renders the matching component inside
   a `WidgetErrorBoundary`, and falls back to `UnknownWidget` for an **unknown
   type** (symmetric to the server registry's `warn + skip`).

**Invariants every custom renderer must preserve** (enforced by contract docs +
review, not by types alone):

- *Never invent data.* Missing values render as `—`; provenance stays visible.
  A custom payload that carries displayable facts should carry its own
  `sources`-equivalent labelling.
- *Failure isolation.* Each widget renders inside a per-widget React error
  boundary; a throwing renderer shows an ERROR card, never a blank dashboard —
  the client-side mirror of `errorAgentState`.
- *No network / no off-machine data*, same as every plugin.

## Consequences

- Adding a *new kind of widget* becomes a reviewed code change in three known
  places (manifest field, `collectData`, a registered `src/` component) plus a
  `npm run build`. It is **not** runtime-pluggable — consistent with the
  local-first, review-to-install security model.
- `agent-card` plugins are 100% backward compatible: no `widgetType`, no
  `collectData`, no `widgetData` ⇒ current code path unchanged. Old
  `settings.json` files keep loading (`WidgetInstance` is unchanged).
- The snapshot contract grows one optional, nullable field — safe per
  [[normalized-agent-data]] ("add fields as `| null` so old collectors stay
  valid"). Non-upgraded clients ignore `widgetData`.
- New surface to keep honest: an untyped `widgetData` payload can smuggle
  invented data past the `AgentState` discipline. Mitigated by the renderer-must-
  preserve-provenance contract and a required fixture test per custom widget.
- Supersedes the "not an extension point" entries in [[extension-points]] and
  [[widget-system]]; those pages moved the item into the supported table and
  [[architectural-risks]] risk #1 is retired.
- Reference implementation shipped: `server/plugins/example-pulse.ts` +
  `server/collectors/example-pulse.ts` (a non-agent "Dashboard Pulse" widget)
  and `src/ui/widgets/PulseWidget.tsx`, exercising the whole seam end-to-end.

## Rejected alternatives

- **Force everything into `AgentState`.** Rejected: distorts non-agent data and
  erodes the provenance invariant that is the project's core value.
- **Discriminated union on `collect()`** (`AgentState | CustomPayload`).
  Rejected: complicates the poll loop and every core consumer of `agents[]`; the
  parallel `widgetData` map isolates the blast radius.
- **Runtime UI plugin dir** (`~/.agent-dashboard/plugins` loaded into the
  bundle). Rejected: breaks the compile-time review-to-install security model and
  the committed-bundle build model.
