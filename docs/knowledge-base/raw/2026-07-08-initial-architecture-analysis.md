# Initial architecture analysis — 2026-07-08

Raw findings from the first deep architecture pass (pre-refactor). Kept as
historical context for why the first round of changes was made. The wiki
describes the current state; some problems below are already fixed.

## What the project was at analysis time

- Node ≥18 ESM server, zero runtime deps, plain `http` + SSE (`server/index.js`).
- Poll loop → agent plugins (`server/plugins/registry.js` scanning its own dir)
  → collectors parsing local JSONL logs (Claude transcripts, Codex rollouts)
  → normalized `emptyAgentState()` shape → snapshot → SSE.
- React 19 + MUI + react-grid-layout frontend (`src/`), built by Vite into
  `public/` (committed). Single 1300-line `App.jsx`.
- Optional Electron shell (`electron/main.cjs`, CJS) importing the ESM server
  in-process; a second theme store implemented over IPC + userData files.
- JSON theme packs in `themes/`; browser mode persisted themes to localStorage.
- Settings in `~/.agent-dashboard/settings.json`; plugin enablement derived
  from widget instances (`isEnabled`).

## Problems found (status at time of writing)

1. Theme validation duplicated verbatim in `electron/main.cjs` and
   `src/theme/themeAdapter.js` → **fixed**: single `shared/theme-schema`.
2. Hardcoded agent branching in core UI (`AgentIcon`: `id === 'codex' ? 'C' : '✶'`,
   Claude color `#d97757`) → **fixed**: icon renders plugin `logo`/`icon` metadata.
3. `collectors/processes.js` hardcoded claude/codex process regexes → **fixed**:
   plugins expose optional `matchProcess(cmd)`.
4. Session→agent aggregation duplicated in both collectors → **fixed**:
   `aggregateFromSessions()` in `server/lib/state`.
5. Dashboard-layout validation lived inside side-effectful `server/index.js`;
   plugin loading hardwired to its own dir → **fixed**: `server/lib/dashboard`
   extracted; `loadPluginsFrom(dir)` exported. Both now tested.
6. Zero tests, no test script → **fixed**: `node:test` suite under `test/`.
7. "Backend connected" dot always green (`#22C55E` hardcoded); frontend silently
   showed mock agents when the API was down → **fixed**: real connection state,
   theme tokens, mocks gated to dev builds.
8. `settings.plugins` written by the API but never read (enablement is
   widget-derived); `saveAgentPluginSettings` dead on the frontend → **fixed**:
   dead frontend code removed; server still accepts the key for compat.
9. README described the pre-React frontend ("zero npm dependencies, plain
   HTML/CSS/JS", `public/app.js`) → **fixed**.
10. `scripts/scan.js` hardcoded the two collectors → **fixed**: iterates registry.

## Not fixed at analysis time (see wiki/risks/architectural-risks.md for current status)

- One widget *type* per plugin: the widget system composes instances on a grid,
  but every widget renders the same `AgentCard`; plugins cannot ship custom
  renderers (frontend is a bundled build — a real gap to close deliberately).
- Two theme persistence backends (Electron userData vs browser localStorage)
  with no sync between them.
- Status is a write-recency heuristic; long silent tool calls read as IDLE.
- Claude rate limits/cost require the statusline reporter side-channel.
