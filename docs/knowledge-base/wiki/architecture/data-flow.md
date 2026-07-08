# Data Flow

How agent activity on disk becomes pixels, end to end. The key boundary: **raw
source data → agent-specific parsing → normalization → snapshot → rendering** —
each stage only sees the previous stage's output.

```mermaid
sequenceDiagram
  participant FS as Log files on disk
  participant PL as Plugin.collect() (per agent)
  participant Loop as Poll loop (server/index.ts)
  participant Snap as Snapshot
  participant SSE as GET /api/stream
  participant UI as React app

  loop every POLL_MS (default 2s)
    Loop->>PL: collect({ isDismissed }) for each ENABLED plugin
    PL->>FS: tail JSONL logs (last 256KB), read overlay files
    PL-->>Loop: AgentState (or throw → errorAgentState)
    Loop->>Loop: process-signal upgrade (unknown→idle)
    Loop->>Loop: pruneInactiveSessions (retention window)
    Loop->>Loop: applyManualOverrides (manual.json)
    Loop->>Loop: diff vs previous snapshot → event feed
    Loop->>Snap: { updatedAt, agents[], processes }
    Snap->>SSE: broadcast('snapshot', …)
    SSE->>UI: EventSource 'snapshot' message
  end
```

## Stage by stage

1. **Raw sources** (agent-owned, read-only):
   - Claude Code: `~/.claude/projects/<sanitized-cwd>/<sessionId>.jsonl`
     (+ `<sessionId>/subagents/agent-*.jsonl` for sub-threads), plus the
     optional statusline reporter file `~/.agent-dashboard/claude-state.json`.
   - Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, plus optional
     `~/.agent-dashboard/codex-state.json`.
2. **Agent-specific parsing** (`server/collectors/claude.ts`, `codex.ts`):
   lists files fresh within `SESSION_RETENTION_S` (max 20), tail-reads each
   (last 256 KB via `tailJsonl`), extracts session id / cwd / model / tokens /
   last event / pending questions. All format knowledge lives here.
3. **Normalization** (`server/lib/state.ts`): collectors build sessions, then
   `aggregateFromSessions()` fills agent-level summary fields (status = most
   urgent session, details = newest session). The shape is `AgentState` from
   `shared/types.ts` — see [[normalized-agent-data]].
4. **Poll loop assembly** (`server/index.ts poll()`):
   - Only plugins with ≥1 dashboard widget are collected (`isEnabled`).
   - A plugin that throws yields `errorAgentState` (status `failed`) —
     one broken agent never takes down the loop.
   - `collectProcesses(processMatchers(plugins))` runs in parallel; a live
     process upgrades an `unknown` agent to `idle`.
   - `pruneInactiveSessions` drops idle sessions older than the retention
     window (attention states are kept regardless of age).
   - `applyManualOverrides` overlays `~/.agent-dashboard/manual.json` (≤24 h
     old), labelling fields `manual`.
   - Session-level diffs against the previous snapshot feed the event ring
     buffer (max 100) and the `event` SSE message.
5. **Transport**: `GET /api/status` (pull) and `GET /api/stream` (SSE push;
   an initial `snapshot` is written on connect; keepalive comment every 25 s).
6. **Rendering** (`src/data/api.ts subscribeSnapshot` → `src/ui/hooks/useSnapshot.ts` → widget grid):
   fetch-once + EventSource; connection state is reported honestly to the top
   bar dot. In dev builds only, an unreachable backend falls back to
   `mockAgents.ts`; production shows an empty, visibly-disconnected dashboard.

## How to safely change this

- New data for an existing agent → its collector (stage 2). Add the field to
  `AgentSession`/`AgentState` in `shared/types.ts` only when it's cross-agent.
- New processing that applies to *all* agents (like pruning) → the poll loop
  (stage 4), never in a collector.
- Don't add per-agent branches in stages 4–6 — that's what plugins are for.
