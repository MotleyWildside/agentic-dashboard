# Normalized Agent Data

The common data model every provider maps into and the only shape the core/UI
consume. Defined once in `shared/types.ts` (`AgentState`, `AgentSession`,
`Snapshot`); constructed via `emptyAgentState()` in `server/lib/state.ts`.

## AgentState (per agent)

Agent-level fields are a **summary of the sessions**: `status` is the most
urgent session status; model/cwd/tokens/etc. mirror the newest session
(`aggregateFromSessions`). Plus agent-only fields: `error` (collector crash),
`setupHint` (how to get data flowing), `sources`, `rateLimits` (account-level),
`costUsd` (sum across sessions where known).

## AgentSession (per session/thread)

One live agent conversation. Sub-agent threads reference their parent via
`parentThreadId` + `threadSource: 'subagent'`; the UI nests them under the
parent row (`buildSessionRows` in `src/ui/lib/sessions.ts`).

## Status model

`AgentStatus` union, priority-ordered in `STATUS_PRIORITY`
(`server/lib/state.ts`) — higher wins when aggregating:

| Status | Priority | Meaning | UI label |
|---|---|---|---|
| `failed` | 6 | collector error / agent failure | ERROR |
| `blocked` | 5 | externally blocked (manual override) | ATTENTION |
| `needs_input` | 4 | waiting on a user answer (`pendingInput`) | WAITING |
| `waiting_approval` | 3 | waiting on tool/plan approval | ATTENTION |
| `running` | 2 | log written < `RUNNING_THRESHOLD_S` (20 s) ago | RUNNING |
| `idle` | 1 | fresh logs exist but quiet | IDLE |
| `unknown` | 0 | no evidence agent exists/ran | UNKNOWN |

Attention statuses (`needs_input`, `waiting_approval`, `blocked`, `failed`)
are exempt from session retention pruning — they stay visible until resolved
or dismissed (`shouldKeepSession`).

Note the deliberate indirection to themes: statuses map to UI *labels* and to
theme *status color keys* (`running/idle/waiting/attention/error`) in
`statusLabel`/`statusColor` (`src/ui/lib/status.ts`) — themes don't know about
`needs_input` etc. Adding a status means updating union + priority + those two
mappings.

## Provenance (`sources`)

`sources: Record<fieldName, 'real' | 'inferred' | 'manual'>` — the honesty
mechanism. `real` = read directly from agent output; `inferred` = heuristic
(status recency, assumed 200k context window); `manual` = user override.
A field absent from `sources` is *unavailable* and must render as `—`, never a
made-up value.

## Snapshot

`{ updatedAt, agents: AgentState[], processes: Record<pluginId, {running, pids}> | null, widgetData?: Record<pluginId, unknown> | null }`
— what `GET /api/status` returns and SSE broadcasts. `widgetData` carries
opaque payloads for custom widget types (`collectData` plugins, ADR-0006); it
is `null` for pure agent-card dashboards. `agents` and `widgetData` are parallel
channels — custom widgets never distort `AgentState`.

## How to safely change this

Add fields as `| null` (or optional) so old collectors stay valid; update
`emptyAgentState`, both collectors' `sources` labelling, the UI rendering, and
this page together. Removing/renaming a field is a breaking contract change —
ADR required.
