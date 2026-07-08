# Testing

`npm test` runs Node's built-in test runner (`node:test`) directly on the
TypeScript files — **zero test dependencies, zero build step**. Type safety is
a separate gate: `npm run typecheck`.

## What exists and what it protects

| File | Protects |
|---|---|
| `test/state.test.ts` | Status aggregation (`worstStatus`), session retention rules (`shouldKeepSession`, `pruneInactiveSessions`), agent summary (`aggregateFromSessions`), collector-failure state |
| `test/registry.test.ts` | Plugin loading error isolation (broken/duplicate/invalid/underscored fixture plugins are skipped, valid ones load), the real claude+codex plugins satisfy the contract, `pluginMeta` leaks no internals, process matchers hit their own CLIs only |
| `test/dashboard.test.ts` | POST /api/settings widget-layout validation & geometry clamping |
| `test/store.test.ts` | settings/dismissed round-trips, safe defaults, widget-derived enablement, dismissal TTL pruning |
| `test/theme-schema.test.ts` | Every bundled theme is valid; invalid packs rejected with readable errors; default theme exists |
| `test/files.test.ts` | JSONL tail/head parsing (corrupt lines, partial-line windows), stale-file rejection |
| `test/linters.test.ts` | The guardrail linters stay runnable and the repo stays clean under them ([[linting]]) |

Deliberate focus: **behavior at extension boundaries** (plugin contract,
validation, persistence formats, provenance rules) — not implementation
details. Don't add tests that would break on a harmless refactor.

**Writing/extending tests is mandatory for every behavior change** — see the
development protocol in [AGENTS.md](../../../../AGENTS.md). "Focused" governs
*what kind* of tests to write, not whether to write them.

## Patterns to reuse

- **Isolated persistence**: set `process.env.AGENT_DASHBOARD_DIR` to a temp
  dir *before* `await import(...)`ing the store (each test file is its own
  process, so this can't leak). See `test/store.test.ts`.
- **Fixture plugins**: `test/fixtures/plugins/` contains intentionally broken
  plugin files; `loadPluginsFrom(fixtureDir)` exercises isolation without
  touching the real registry dir.
- **Temp log files** for parser tests: `test/files.test.ts`.

## What is NOT covered (be careful there)

- `server/index.ts` HTTP layer end-to-end (it boots on import; verify manually
  with `npm start` + curl, or extract logic into `server/lib/` first — that's
  the established pattern).
- The React frontend (no component tests). `npm run typecheck` + `npm run build`
  + eyeballing `npm run dev` is the current bar.
- The collectors' full parsing paths against *real* Claude/Codex logs — the
  formats are third-party and shift; `npm run scan` on a machine with real
  logs is the practical check.

## Lint tooling

No ESLint/Prettier (deliberate — match the style of the file you're editing),
but two **project-specific guardrail linters** run via `npm run lint` and
inside `npm test`: docs freshness and architecture boundaries. See [[linting]]
and ADR-0005.
