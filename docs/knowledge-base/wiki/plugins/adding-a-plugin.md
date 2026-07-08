# Adding a Plugin

The general recipe (for an agent integration — the only plugin kind today —
see the fuller [[adding-an-agent-provider]] walkthrough).

1. **Copy the template**: `server/plugins/_template.ts` →
   `server/plugins/<id>.ts` (no leading underscore — underscored files are
   skipped by the registry).
2. **Fill the manifest**: `id` (stable, lowercase, url-safe), `name`, `icon`,
   optional `logo` (inline SVG), optional `layout` limits, optional
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

## Checklist for review

- [ ] `id` doesn't collide with an existing plugin
- [ ] No writes outside `~/.agent-dashboard/`
- [ ] No remote/network access
- [ ] Errors inside `collect()` throw (the core converts them to a visible
      `failed` state) rather than being silently swallowed into fake data
- [ ] `npm test` + `npm run typecheck` green
- [ ] Wiki updated
