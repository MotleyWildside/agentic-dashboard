# Runtime Boundaries

Four runtimes touch this codebase. Knowing which code runs where explains
almost every "why is this file shaped like that" question.

| Runtime | What runs there | Language/module system |
|---|---|---|
| **System Node ≥22.18** | `server/**`, `shared/**`, `scripts/scan.ts`, tests | TypeScript, executed **directly** via Node type stripping (`node server/index.ts`) |
| **Browser** | `src/**` after Vite build (served from `public/`) | TypeScript/TSX, transpiled by Vite |
| **Electron main (bundled Node 20)** | `electron/*.cjs` + the **compiled** server from `dist-server/` | CommonJS JS; cannot type-strip `.ts` — hence the tsc build step |
| **Electron renderer** | same built frontend from `public/`, plus `window.agentThemes` from `preload.cjs` | as browser |

## The dual server execution model (ADR-0004)

The server sources are **erasable-syntax-only** TypeScript (no enums, no
namespaces, no parameter properties — enforced by `erasableSyntaxOnly` in
`tsconfig.server.json`), so they run in two ways:

1. **Directly**: `npm start` / `npm run dev` → `node server/index.ts`.
   Zero build step, relative imports carry explicit `.ts` extensions.
2. **Compiled**: `npm run build:server` → `tsc -p tsconfig.server.json` emits
   plain ESM JS into `dist-server/` (imports rewritten `.ts`→`.js` by
   `rewriteRelativeImportExtensions`). The Electron shell and packaged apps use
   only this output.

Consequences baked into the code:

- `server/index.ts` resolves `public/` from **either** location (source:
  `server/../public`; compiled: `dist-server/server/../../public`).
- `server/plugins/registry.ts` scans for both `*.ts` and `*.js` plugin files so
  it works from source *and* from `dist-server/`.
- `electron/main.cjs` dynamic-imports `dist-server/server/index.js` and
  `dist-server/shared/theme-schema.js`; the `app`/`dist:*` npm scripts run
  `build:server` first.

## Server ⇄ frontend boundary

The only interface is the HTTP API on `127.0.0.1:<PORT>` (default 4321 for
`npm start`; packaged Electron sets `PORT=0` and uses the OS-assigned free
loopback port):

| Endpoint | Purpose |
|---|---|
| `GET /api/status` | full `Snapshot` |
| `GET /api/agents` | agents array only |
| `GET /api/config` | public config + `pluginMeta()` (id, name, icon, logo, layout — no collector internals) |
| `GET /api/events` | event ring buffer |
| `GET /api/stream` | SSE: `snapshot` + `event` messages, 25 s keepalives |
| `GET/POST /api/settings` | widget layout (validated server-side); GET also returns derived per-plugin `enabled` |
| `POST /api/dismiss` | hide a session (never touches the transcript) |

Types for the payloads live in `shared/types.ts` and are imported by **both**
sides — the API shape and the types cannot drift silently.

In dev, Vite (`:5173`) proxies `/api` to the server on `:8765`
(`vite.config.ts` + the `dev` npm script).

## Electron boundary

- Renderer has `nodeIntegration: false`, `contextIsolation: true`; its only
  extra capability is the `ThemeApi` bridged by `preload.cjs`.
- Electron main additionally owns theme file persistence (userData) — see
  [[theme-system]].
- If the configured port is already served (common in dev, e.g. a terminal
  `npm start`), the shell attaches to the running server instead of failing
  (`EADDRINUSE` handling in `startServer()`). Packaged Electron avoids this
  path by requesting an OS-assigned free port unless `PORT` is explicitly set.

## How to safely change this

- New shared logic → `shared/` (dependency-free) so all runtimes can use it;
  Electron gets it via `dist-server/shared/`.
- Don't add non-erasable TS syntax to `server/`/`shared/` — `npm start` breaks.
- Don't import `server/` code into `src/` (or vice versa); talk over the API
  and `shared/types.ts`.
