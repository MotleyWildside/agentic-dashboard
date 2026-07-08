# Mimiron

A local-first dashboard for monitoring your AI coding agents — **Claude Code** and
**OpenAI Codex** — designed for a small external monitor (1024×600 / 800×480).

- TypeScript throughout; zero-dependency Node.js (≥ 22.18) server that runs its
  `.ts` sources directly (native type stripping); React + MUI frontend built with Vite
  into `public/` (pre-built output is committed, so `npm start` alone works).
- Binds to `127.0.0.1` only. Reads local files only. Sends nothing anywhere.
- Never invents data: every field is labelled `real`, `inferred`, or `manual`;
  missing data shows as `unavailable`.

## Quick start

```bash
npm run start        # serve the dashboard at http://127.0.0.1:4321
npm run dev          # server (:8765) + Vite dev frontend (:5173) with hot reload
npm run scan         # one-shot: print what data is available on this machine
npm test             # run the test suite (node:test, no extra deps)
npm run build        # rebuild the frontend bundle into public/
```

Open http://127.0.0.1:4321. Double-click the page to toggle fullscreen (kiosk mode).

The server shuts down cleanly on Ctrl+C — it tears down live SSE connections and
releases the port immediately, so `--watch` restarts never collide. `npm run dev`
also runs with `FREE_PORT=1`: if a stray/zombie instance is still holding the
port, it's killed on startup instead of erroring with `EADDRINUSE` (macOS/Linux).

Configuration is via environment variables or a `.env` file — see
[.env.example](.env.example).

### Desktop app (Electron)

Prefer a native window over a browser tab? An Electron shell wraps the exact same
server and UI — no frontend changes, all the same `.env` config.

```bash
npm install          # one-time: pulls in electron (a devDependency)
npm run app          # boots the server and opens it in a desktop window
```

The shell starts the dashboard server in-process and points the window at it. If
a dashboard is already serving the port (e.g. a `npm start` running elsewhere),
the window simply attaches to it instead of failing.

### Building a distributable app

Packaged with [electron-builder](https://www.electron.build/); output lands in
`dist-app/`.

```bash
npm run dist:mac     # → dist-app/*.dmg   (arm64 + x64), build on macOS
npm run dist:win     # → dist-app/*.exe   (NSIS installer), build on Windows
npm run dist         # both, if your host toolchain supports it
```

- **macOS**: build on a Mac. The app is **unsigned**, so on first launch macOS
  Gatekeeper will block it — recipients right-click the app → **Open** → **Open**
  (only needed once). Ship the matching `.dmg` for the target's chip (Apple
  Silicon = `-arm64.dmg`, Intel = the plain `.dmg`).
- **Windows**: run `npm run dist:win` **on a Windows machine** (or CI). The
  resulting `.exe` is also unsigned, so SmartScreen shows a "More info → Run
  anyway" prompt on first run. Cross-building a Windows `.exe` from macOS is
  possible but needs Wine and is fiddly — building on Windows is the clean path.

Packaged builds run on their defaults (port 4321, reading `~/.claude` and
`~/.codex`); the `.env` file is a dev-time convenience and is not bundled.

## Where the data comes from

### Claude Code

| Field | Source | Label |
|---|---|---|
| session id, cwd, last activity, last event | JSONL transcripts in `~/.claude/projects/<project>/<session>.jsonl` — every line carries `cwd`, `sessionId`, `timestamp` | real |
| model, token usage | last `assistant` line's `message.model` / `message.usage` (input + cache-read + cache-creation + output) | real |
| context % | tokens ÷ assumed 200k window (Claude Code doesn't write the window size to the transcript) | inferred |
| cost (USD) | **statusline reporter only** (see below) — Claude Code computes cost itself and passes it to the statusline command | real |
| status | transcript write recency: written < `RUNNING_THRESHOLD_S` (20s) ago → RUNNING, else IDLE | inferred |
| rate limits | **statusline reporter only** — the statusline payload includes `rate_limits.five_hour/seven_day` (used %, reset time) for Claude.ai Pro/Max subscribers | real |
| context window size | **statusline reporter**: `context_window.context_window_size` (real); without it, assumed 200k | real / inferred |

#### Statusline reporter (recommended)

Claude Code pipes a JSON payload (model, cwd, session, cost) to your configured
statusline command on every refresh. [scripts/claude-statusline-reporter.js](scripts/claude-statusline-reporter.js)
captures that into `~/.agent-dashboard/claude-state.json` for the dashboard,
**and** prints a normal statusline, so it doubles as your everyday statusline.

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /ABSOLUTE/PATH/TO/AgenticDashboard/scripts/claude-statusline-reporter.js"
  }
}
```

(or run `/statusline` inside Claude Code and point it at the script).

### Codex

Codex writes rollout logs to `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`,
which are surprisingly rich:

| Field | Source | Label |
|---|---|---|
| session id, cwd | `session_meta` (first line) and `turn_context` events | real |
| model | `turn_context.model` | real |
| tokens, context window, context % | `token_count` events: exact usage + `model_context_window` | real |
| **rate limits** | `token_count.rate_limits` — primary (~5h) and secondary (~7d) window `used_percent` + reset time, plan type | real |
| status | file write recency; `*_approval_request` as the last event → WAITING APPROVAL | inferred |
| cost (USD) | **not recorded locally** by Codex | unavailable |

### Fallbacks

- **Process detection** (`ps`): if no fresh logs exist but a `claude`/`codex`
  process is running, status upgrades from UNKNOWN to IDLE.
- **Manual overrides**: drop a JSON file at `~/.agent-dashboard/manual.json` to
  override any display field (ignored after 24h):

  ```json
  { "codex": { "status": "blocked", "lastEvent": "waiting on VPN" } }
  ```

  A Codex-specific override file `~/.agent-dashboard/codex-state.json` is also
  read (fresh ≤ 10 min) — useful for wrapper scripts or future Codex hooks.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/status` | full snapshot: `{ updatedAt, agents[], processes }` |
| `GET /api/agents` | normalized agent states only |
| `GET /api/events` | recent dashboard events (status changes etc.) |
| `GET /api/config` | effective paths & polling config, plus registered plugin metadata (no secrets) |
| `GET /api/stream` | Server-Sent Events: `snapshot` + `event` messages |
| `GET /api/settings` | dashboard widget layout + derived per-plugin enabled state (a plugin is "enabled" iff it has ≥1 widget on the dashboard) |
| `POST /api/settings` | body `{ dashboard: { widgets: [...] } }` — save the widget layout (validated & clamped server-side). A legacy `{ plugins }` key is still accepted but no longer drives polling. |
| `POST /api/dismiss` | body `{ agentId, sessionId }` — hide a session from the dashboard (the transcript file is never touched) |

Agent state shape: see [shared/types.ts](shared/types.ts) (`AgentState`).

## Agent plugins

Each agent window is a plugin under [server/plugins/](server/plugins/) —
a module with a default export `{ id, name, icon, logo?, layout?, matchProcess?, collect }`.
`collect(ctx)` returns an agent state shaped like `emptyAgentState()`;
`ctx.isDismissed(sessionId)` tells you which sessions the user hid;
`matchProcess(cmd)` optionally lets the process fallback detect your agent's CLI.
Adding a new agent (OpenCode, Antigravity, …) is dropping one file here —
no changes to `server/index.ts` or the frontend required. See
[server/plugins/_template.ts](server/plugins/_template.ts) for the contract,
and [docs/knowledge-base/](docs/knowledge-base/) for the full architecture wiki.
Widgets are added/removed from the dashboard's edit mode; the layout persists
to `~/.agent-dashboard/settings.json`, and only plugins with at least one
widget are polled.

Dismissed sessions persist to `~/.agent-dashboard/dismissed.json` (pruned
after 7 days) — hiding a session never deletes its transcript.

If a Claude Code session is blocked on `AskUserQuestion` or plan approval
(`ExitPlanMode`) with no reply yet, its status becomes `NEEDS INPUT` and the
question text + answer options are shown directly in the session block —
you still have to answer in the actual terminal/IDE, the dashboard can only
display it.

## Privacy & security

- Server binds to `127.0.0.1` by default (`HOST` to change — don't, unless you
  must).
- Mostly **metadata** is read/shown: status, model, token counts, cwd, event
  *types*. The one exception: when a Claude Code session is waiting on
  `AskUserQuestion`/`ExitPlanMode`, the question text and answer option
  labels are shown so you know what's being asked — everything else about
  message contents stays out of the API and UI.
- Log/transcript paths are configurable and read-only.
- No analytics, no external requests — the frontend loads no CDN assets.

## Known limitations / TODOs

- **Claude rate limits without the reporter**: not written to any local file
  (verified: transcripts, `~/.claude.json`, `policy-limits.json` carry none).
  The statusline reporter is the only source — configure it to see them.
- **Claude rate limits appear only after the first API response** of a session,
  and only for Claude.ai Pro/Max subscribers (per Claude Code docs).
- **Claude context window size**: real when the reporter runs
  (`context_window.context_window_size`); otherwise assumed 200k (`inferred`).
- **Codex cost**: no local spend data exists; shown as `unavailable` by design.
- **WAITING APPROVAL for Claude**: not reliably detectable from transcripts;
  currently only Codex approval requests are detected. A Claude Code
  `Notification` hook could write to `~/.agent-dashboard/manual.json` to fill
  this gap.
- Status is a **recency heuristic** (labelled `inferred`) — a long-running tool
  call that writes nothing for >20s shows as IDLE until output resumes.
