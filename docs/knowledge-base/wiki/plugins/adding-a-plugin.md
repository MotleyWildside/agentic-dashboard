# Adding a Plugin

The general recipe (for an agent integration — the most common plugin kind —
see the fuller [[adding-an-agent-provider]] walkthrough). For a plugin that
renders as something other than the agent card, see *Custom widgets* below.

1. **Copy the template**: `server/plugins/_template.ts` →
   `server/plugins/<id>.ts` (no leading underscore — underscored files are
   skipped by the registry).
2. **Fill the manifest**: `id` (stable, lowercase, url-safe), `name`, `icon`,
   optional `logo` (inline SVG or local `/plugin-assets/...` image URL),
   optional `layout` limits, optional
   `matchProcess`.
3. **Write the collector** in `server/collectors/<id>.ts`. It must:
   - return an `AgentState` built from `emptyAgentState(id, name, icon)`;
   - never invent values — leave unknown fields `null`;
   - label provenance in `sources` (`real` / `inferred`);
   - respect `ctx.isDismissed(sessionId)`;
   - call `aggregateFromSessions(state)` after filling `state.sessions`;
   - set a `setupHint` when its data source is missing (so the card explains
     itself instead of looking broken).
4. **Restart** the server (`npm run dev` auto-restarts). The plugin appears in
   the dashboard's edit-mode "Add widget" dialog automatically; adding a
   widget enables polling for it.
5. **Test**: add a fixture-driven test if your collector has parsing logic
   worth protecting (see `test/registry.test.ts` and [[testing]]); run
   `npm test` and `npm run typecheck`.
6. **Document**: add the plugin to [[module-map]]'s table and note anything
   unusual in [[agent-provider-contract]]. If you changed the contract itself,
   that's an ADR.

## Custom widgets (non-agent renderers, ADR-0006)

To render as something other than the agent card (a chart, a log stream, a
liveness indicator):

1. In the manifest, set `widgetType: '<key>'` and provide `collectData(ctx)`
   instead of `collect` — it returns any JSON payload (opaque to the core).
2. Add a renderer component and register it under `<key>` in
   `src/ui/widgets/registry.tsx` (wrap non-agent widgets in `WidgetShell`).
   Read your payload from the `data` prop; treat it defensively.
3. `npm run build` — renderers ship in the committed bundle (no runtime load).
4. Keep the invariants: never invent data, no network, and let a missing/`null`
   payload render as an honest empty state.

Worked example: `server/plugins/example-pulse.ts` +
`server/collectors/example-pulse.ts` + `src/ui/widgets/PulseWidget.tsx`.

## Checklist for review

- [ ] `id` doesn't collide with an existing plugin
- [ ] No writes outside `~/.agent-dashboard/`
- [ ] No remote/network access
- [ ] Errors inside `collect()` throw (the core converts them to a visible
      `failed` state) rather than being silently swallowed into fake data
- [ ] `npm test` + `npm run typecheck` green
- [ ] Wiki updated
