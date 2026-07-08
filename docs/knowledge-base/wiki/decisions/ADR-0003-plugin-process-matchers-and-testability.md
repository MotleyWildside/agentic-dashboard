# ADR-0003 — Plugin process matchers + core testability extraction

**Status**: accepted (2026-07-08)

## Context

Three pieces of agent knowledge or core logic sat in the wrong place:

1. `server/collectors/processes.js` hardcoded claude/codex process regexes —
   a new agent plugin couldn't participate in process-based liveness detection
   without editing core.
2. Dashboard-layout validation lived inside `server/index.js`, which boots an
   HTTP server on import — the validation was untestable.
3. The plugin registry could only scan its own directory — plugin-loading
   error isolation was untestable.
4. Both collectors hand-rolled the same session→agent aggregation.
5. The frontend showed hardcoded per-agent icons/colors and mock data when the
   backend was down, and its "connected" dot was always green.

## Decision

- Plugins gain optional `matchProcess(cmd: string) => boolean`; the process
  collector takes matchers derived from the registry
  (`processMatchers(plugins)`), throwing matchers count as no-match.
- `validateDashboard`/`normalizeDashboard` extracted to pure
  `server/lib/dashboard.ts`, parameterized by plugin metadata.
- Registry exports `loadPluginsFrom(dir)`; tests exercise it against fixture
  plugins (broken import, invalid shape, duplicate id, underscored).
- `aggregateFromSessions()` added to `server/lib/state.ts`; both collectors
  use it.
- Frontend: agent icon renders plugin `logo`/`icon` metadata; connection dot
  reflects real `subscribeSnapshot` connectivity via theme tokens; mock data
  is gated to dev builds (`import.meta.env.DEV`).
- Test suite (`node:test`, zero deps) introduced as `npm test`.

## Consequences

- Adding an agent now touches zero core files, including process detection.
- Extension boundaries are regression-tested; `server/index.ts` keeps
  shrinking toward pure wiring (remaining untested HTTP layer noted in
  [[testing]]).
- Production builds no longer fabricate agents when the server is down —
  a behavior change, but one that enforces the "never invent data" invariant.
- Legacy `settings.plugins` API input is still accepted but documented as
  dead ([[settings-and-persistence]]).
