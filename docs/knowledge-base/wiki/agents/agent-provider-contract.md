# Agent Provider Contract

The `AgentPlugin` interface in `shared/types.ts` is the provider contract:
how an agent integration exposes data to the dashboard. The authoritative
field docs are in `server/plugins/_template.ts`; this page explains the
semantics and the guarantees each side makes.

## What a provider exposes

| Contract element | Where | Semantics |
|---|---|---|
| Identity | `id`, `name`, `icon`, `logo?` | `id` is a stable key used in settings, dismissals (`"<id>:<sessionId>"`), SSE events, and widget instances. Renaming an id orphans user settings — don't. |
| Widget sizing | `layout?` | Merged over registry defaults `{ minW:2, minH:2, defaultW:6, defaultH:5, maxW:8, maxH:40 }`; the server clamps widget geometry to these on save. |
| Liveness signal | `matchProcess?(cmd)` | Ran against every `ps` line each poll. Match ⇒ agent process alive ⇒ an `unknown` agent upgrades to `idle` ("installed, no fresh logs"). Throwing = no-match. |
| Data | `collect(ctx)` | Async, called every poll **only while the plugin has ≥1 widget**. Returns a full `AgentState` ([[normalized-agent-data]]). |

Through `AgentState`, a provider reports: status, active sessions (with
sub-agent threads), repositories/cwd, model + effort metadata, token/context
usage, cost, rate limits, last event, required user input
(`pendingInput` + status `needs_input`), errors, setup hints, and a
per-field provenance map (`sources`).

## What the core guarantees the provider

- **Isolation**: if `collect()` rejects, the core substitutes
  `errorAgentState` — the failure is visible on the card, not fatal.
- **No double-polling**: the poll loop never overlaps itself; a slow collector
  delays the next tick rather than stacking.
- **Post-processing**: the core prunes stale idle sessions
  (`SESSION_RETENTION_S`), applies manual overrides, and diffs snapshots for
  the event feed — providers shouldn't reimplement any of that.
- **Dismissals**: the core passes `ctx.isDismissed`; the provider must filter
  dismissed sessions *before* aggregating so hidden sessions don't leak into
  agent-level summaries.

## What the core expects from the provider

- **Never invent data.** Unknown = `null`. Estimated = value + `sources`
  label `inferred`. This is the project's core promise to the user.
- **Read-only** access to the agent's files; writes only under
  `~/.agent-dashboard/`.
- Sessions sorted **newest-first** (the aggregate takes `sessions[0]` as the
  representative).
- Use the helpers, don't fork them: `emptyAgentState`, `worstStatus`,
  `aggregateFromSessions`, `projectNameFromCwd` (`server/lib/state.ts`),
  `tailJsonl`/`headJsonl`/`readJsonSync` (`server/lib/files.ts`).

## Reference implementations

- `server/plugins/claude.ts` + `server/collectors/claude.ts` — transcripts +
  optional reporter overlay + pending-input detection (the richest example).
- `server/plugins/codex.ts` + `server/collectors/codex.ts` — rollout logs with
  exact token/rate-limit data + manual state-file override.

## Changing the contract

Any change to `AgentPlugin`, `AgentState`, or `AgentSession` must update, in
one change: `shared/types.ts`, `server/plugins/_template.ts`, both reference
providers, this page + [[normalized-agent-data]], and an ADR if semantics
changed. `npm run typecheck` will catch most drift mechanically.
