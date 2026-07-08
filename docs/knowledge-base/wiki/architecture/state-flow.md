# State Flow

Where state lives, who owns it, and how it moves. There is deliberately **no
database and no state library** — state is either ephemeral in-process, or a
small JSON file with one owner.

## Server state (`server/index.ts` module scope)

| State | Type | Lifetime | Notes |
|---|---|---|---|
| `snapshot` | `Snapshot` | in-memory, rebuilt every poll | the single source the API serves |
| `events` | ring buffer (100) | in-memory | status-change feed |
| `sseClients` | `Set<ServerResponse>` | per-connection | torn down explicitly on shutdown so the port frees |
| `settings` | `Settings` | in-memory, mirrored to disk on every POST | loaded once at boot from `settings.json` |
| `dismissed` / `dismissedSet` | map + set | in-memory + disk | `"<agentId>:<sessionId>" → ISO date`; 7-day TTL |

The poll loop is re-entrancy-guarded (`polling` flag): a slow collect cycle is
never overlapped by the next tick.

## Client state (plain React hooks — no state library, deliberately)

| State | Owner | Source of truth | Notes |
|---|---|---|---|
| `snapshot`, `connected` | `src/ui/hooks/useSnapshot.ts` | server (SSE) | client never mutates agent data; `connected` drives the top-bar dot |
| `agentConfig` (plugins + settings) | `src/ui/hooks/useAgentConfig.ts` | `GET /api/config` + `GET /api/settings` | refreshed after saves |
| `liveLayout`, `layoutError` | `src/ui/dashboard/useDashboard.ts` | client-only | `liveLayout` is the drag-preview; committed via POST then discarded |
| `editMode`, dialog open flags | `src/ui/App.tsx` | client-only | passed one level down as props |
| theme state | `src/main.tsx` | via `ThemeApi` (Electron IPC or localStorage) | |

Widget layout writes are **optimistic**: `saveDashboard()` updates local state,
POSTs, then adopts the server's normalized reply (or reverts by re-fetching on
error). The server response is authoritative because it clamps geometry.

## Persistent state

See [[settings-and-persistence]] for the full file inventory. Ownership rule:
**exactly one writer per file** — the server owns `~/.agent-dashboard/settings.json`
and `dismissed.json`; agents/reporters own their state files (dashboard only
reads them); Electron main owns its theme store; the browser owns localStorage
theme keys.

## How to safely change this

- New server-side state: keep it in `server/index.ts` module scope if
  ephemeral; add a store function in `server/lib/store.ts` (atomic
  tmp+rename write) if persisted.
- New client state: prefer deriving from `snapshot`/`agentConfig` over adding
  parallel copies. Feature-local state goes in that feature's hook
  (`useDashboard`-style); if two features need it, lift it into `App`. A state
  library (zustand & co.) stays off the table until prop drilling exceeds ~2
  levels — the current graph is one server-fed snapshot plus a handful of UI
  flags, and the custom hooks keep swap-in trivial if that changes.
- Never persist anything derived from log parsing — the snapshot is always
  reproducible from disk.
