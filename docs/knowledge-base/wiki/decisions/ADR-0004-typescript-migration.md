# ADR-0004 — TypeScript migration & dual execution model

**Status**: accepted (2026-07-08)

## Context

The project was plain JS. The normalized agent-data contract — the heart of
the plugin architecture — existed only as JSDoc prose, so contract drift
between server, API, and frontend was undetectable. The codebase was small
enough to migrate in one pass. Constraint: Electron 33's bundled Node (20)
cannot run TypeScript, while system Node ≥22.18 strips types natively.

## Decision

1. **All app code is TypeScript, strict**: `server/`, `shared/`, `src/`,
   `test/`, `scripts/scan.ts`. Domain types live in `shared/types.ts` and are
   imported by both sides of the API.
2. **Dual execution for server code**:
   - Direct: `node server/index.ts` (dev/start/tests) via Node type stripping.
     Sources are `erasableSyntaxOnly` with explicit `.ts` import extensions.
   - Compiled: `tsc -p tsconfig.server.json` → `dist-server/` (ESM JS,
     imports rewritten `.ts`→`.js`) for Electron and packaged builds.
3. **Deliberately NOT migrated**:
   - `electron/*.cjs` — thin shell; Electron main wants CJS; consumes compiled
     TS via dynamic import of `dist-server/`.
   - `scripts/claude-statusline-reporter.js` — its absolute path is installed
     in users' `~/.claude/settings.json`; renaming breaks user configs.
4. **engines bumped to Node ≥22.18** (was ≥18.17).
5. Registry scans `*.ts` *and* `*.js` plugin files so it works from source and
   from `dist-server/`; `server/index.ts` resolves `public/` from either tree.

## Consequences

- Contract drift (plugin shape, API payloads, theme packs, settings formats)
  is now caught by `npm run typecheck`.
- Two build artifacts to keep in mind: committed `public/` (frontend) and
  gitignored `dist-server/` (Electron server) — see [[commands]] gotchas.
- Server sources must stay erasable-syntax-only (no enums/namespaces/parameter
  properties) or `npm start` breaks while `build:server` still passes — the
  tsconfig flag enforces this at typecheck time.
- Users on Node <22.18 lose `npm start`; acceptable for a developer tool in
  2026.
