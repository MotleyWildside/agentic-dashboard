# Commands

Node **≥22.18 required** (the server runs TypeScript natively via type
stripping). All commands from the repo root.

## Daily

| Command | What it does |
|---|---|
| `npm run dev` | Server on **:8765** (watch mode, `FREE_PORT=1`) + Vite dev frontend on **:5173** with HMR and `/api` proxy. Use this for frontend work. |
| `npm start` | Production-style: `node server/index.ts` on **:4321**, serving the committed `public/` bundle. No hot reload. |
| `npm test` | `node --test "test/*.test.ts"` — the whole suite, no build needed |
| `npm run lint` | docs linter + architecture linter ([[linting]]) — also runs inside `npm test` |
| `npm run typecheck` | `tsc -p tsconfig.json` (frontend) + `tsc -p tsconfig.server.json --noEmit` (server/shared/tests) |
| `npm run scan` | One-shot: run every provider once, print normalized JSON |

## Building

| Command | What it does |
|---|---|
| `npm run build` | Vite → `public/` (**committed**; run this after any `src/` change or `npm start`/Electron serve a stale UI) |
| `npm run build:server` | `tsc -p tsconfig.server.json` → `dist-server/` (gitignored; needed by Electron) |
| `npm run app` | `build:server` + launch the Electron shell |
| `npm run dist:mac` / `dist:win` / `dist` | full build (frontend + server) + electron-builder → `dist-app/` (unsigned; see README for Gatekeeper/SmartScreen notes) |

## Environment

Copy `.env.example` → `.env` for local overrides (`PORT`, `POLL_MS`, log
directories…). The `dev` script pins `PORT=8765` for the proxy; plain
`npm start` uses `.env`/default 4321.

## Gotchas

- **Two builds exist.** `public/` (frontend, committed) and `dist-server/`
  (server for Electron, gitignored). `npm start` needs neither rebuilt for
  server changes — it runs the TS sources — but frontend changes always need
  `npm run build` unless you're on the Vite dev server.
- The server frees its own port politely on Ctrl+C; `FREE_PORT=1` (dev) also
  kills zombie holders on startup (macOS/Linux, `lsof`).
- `scripts/claude-statusline-reporter.js` is referenced by absolute path from
  users' `~/.claude/settings.json` — don't move/rename it.
