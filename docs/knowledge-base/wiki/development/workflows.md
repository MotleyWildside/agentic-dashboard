# Development Workflows

The non-negotiable baseline for **every** change is the development protocol
in [AGENTS.md](../../../../AGENTS.md): tests written/extended, documentation
updated, verification green — in the same change. The workflows below build
on it.

## Feature workflow

1. **Read first**: [[00-agent-entrypoint|the agent entrypoint]]
   (../00-agent-entrypoint.md), then the wiki page for the area you're
   touching ([[index]]).
2. Place the code by the boundary rules in [[module-map]] — agent-specific
   logic in plugins/collectors, cross-agent logic in `server/lib/` or the poll
   loop, UI in `src/`, contracts in `shared/`.
3. **Write or extend tests for the changed behavior** ([[testing]]) — this is
   mandatory, not situational; extension boundaries (contracts, validation,
   persistence, normalization) get priority. Extract logic to `server/lib/`
   first if it's stuck somewhere untestable.
4. Verify: `npm run typecheck` + `npm test`; frontend changes also
   `npm run build` (commit the regenerated `public/`) and eyeball `npm run dev`.
5. **Update the wiki pages** that now describe your change
   ([../../schema.md](../../schema.md)) and append to [[log]] — a change that
   leaves the docs stale is not done.

## Architecture-change workflow

For anything that moves a boundary (new extension point, contract change,
new persisted file, new runtime):

1. Check [[architectural-risks]] and existing ADRs — the constraint you're
   about to fight is probably documented with its rationale.
2. Write the ADR **first** (`wiki/decisions/ADR-NNNN-…`): context, decision,
   consequences. Small honest ADRs beat big aspirational ones.
3. Prefer incremental, reviewable steps over rewrites. If a rewrite feels
   necessary, the ADR must say why smaller steps fail.
4. Keep both execution paths green: `npm start` (TS-native) *and*
   `npm run build:server` + Electron (`dist-server/`) — [[runtime-boundaries]]
   explains why they differ.
5. Migration rule for persisted formats: old files must keep loading
   ([[settings-and-persistence]]).
6. Update every wiki page whose claims your change invalidates — the health
   check in [../../schema.md](../../schema.md) will catch you eventually anyway.

## Release/packaging workflow

`npm run dist:mac` / `dist:win` (see [[commands]]). Remember `public/` must be
freshly built & committed; `dist-server/` is rebuilt by the script.
