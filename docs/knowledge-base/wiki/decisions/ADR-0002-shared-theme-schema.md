# ADR-0002 — Single shared theme schema module

**Status**: accepted (2026-07-08)

## Context

Theme validation (`validateThemePack`, hex checks, default theme id) existed
twice, verbatim: in `electron/main.cjs` (CJS, validates imports into the
userData store) and `src/theme/themeAdapter.js` (ESM, validates browser
imports). The copies were already one refactor away from divergent validation
— a theme accepted on one backend could be rejected by the other.

## Decision

One module, `shared/theme-schema.ts`, owns the schema (validation +
`DEFAULT_THEME_ID` + status-key list). The renderer imports it directly; the
Electron main process consumes it via the compiled `dist-server/shared/`
output (it cannot run TS — see ADR-0004). `shared/` modules must remain
dependency-free since every runtime loads them.

## Consequences

- Validation can no longer drift between backends; bundled themes are
  regression-tested against the single schema (`test/theme-schema.test.ts`).
- Electron gains a build-step dependency for schema changes (`npm run app`
  runs it automatically).
- Any new theme rule lands in exactly one file.
