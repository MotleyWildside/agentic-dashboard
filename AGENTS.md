# Instructions for AI agents

This repository maintains its compiled project knowledge in a **knowledge base**
— read it instead of re-discovering the architecture from raw code, and keep it
updated as part of your changes.

## Where to look

1. **Start here**: [docs/knowledge-base/00-agent-entrypoint.md](docs/knowledge-base/00-agent-entrypoint.md)
   — 60-second orientation, rules of the road, task→recipe table.
2. **Wiki index**: [docs/knowledge-base/wiki/index.md](docs/knowledge-base/wiki/index.md)
   — architecture, plugins, agent providers, widgets, themes, settings, testing, ADRs, risks.
3. **Maintenance rules**: [docs/knowledge-base/schema.md](docs/knowledge-base/schema.md)
   — when and how to update the wiki, how to add pages/ADRs, wiki health check.

Answer architecture questions **from the wiki first**, verifying load-bearing
claims against the referenced source files. If the wiki and code disagree, the
wiki has a bug — fix it in the same change.

## Quick facts (details in the wiki)

- TypeScript everywhere, strict. The server runs its `.ts` sources directly on
  Node ≥22.18 (type stripping); Electron consumes tsc output in `dist-server/`.
- Domain types contract: `shared/types.ts`. Agent integrations are plugins in
  `server/plugins/` (see `_template.ts`).
- Frontend (`src/`) is built by Vite into the **committed** `public/` — run
  `npm run build` after frontend changes or the served app stays stale.
- Verify with `npm test` and `npm run typecheck` before finishing.
- Never invent data: fields are `real`/`inferred`/`manual` or `null`.

## Development protocol (mandatory — every change, no exceptions)

A change is **not done** until all three hold:

1. **Tests are written or extended.** Any new or changed behavior gets test
   coverage in `test/` (`node:test`, see
   [docs/knowledge-base/wiki/development/testing.md](docs/knowledge-base/wiki/development/testing.md)).
   - New logic → new focused tests; changed logic → update the tests that
     protect it (never delete a failing test to "make it pass").
   - Prioritize extension boundaries: plugin contract, validation,
     persistence formats, normalization, theme schema.
   - Logic trapped in untestable places (e.g. `server/index.ts`) gets
     extracted into `server/lib/` first — that's the established pattern.
   - Pure UI markup is exempt from unit tests, but must still pass
     `npm run typecheck` and `npm run build`.
2. **Documentation is updated in the same change.**
   - Update every knowledge-base page whose claims your change invalidates
     (rules: [docs/knowledge-base/schema.md](docs/knowledge-base/schema.md)),
     and append a line to
     [docs/knowledge-base/wiki/log.md](docs/knowledge-base/wiki/log.md).
   - Architecture / contract / persistence-format / theme-schema change →
     the matching wiki page(s); non-trivial decision → an ADR under
     [docs/knowledge-base/wiki/decisions/](docs/knowledge-base/wiki/decisions/).
   - New module/plugin/widget/theme → document per the wiki recipes; also
     keep `server/plugins/_template.ts` and README in sync when the plugin
     contract or commands change.
   - If code and wiki disagree, the wiki has a bug — fix it now, not later.
3. **Verification is green**: `npm test` · `npm run typecheck` ·
   `npm run lint` (docs + architecture guardrail linters — see
   [docs/knowledge-base/wiki/development/linting.md](docs/knowledge-base/wiki/development/linting.md))
   · plus `npm run build` for any `src/` change (the `public/` bundle is
   committed). Never weaken a lint rule to make a change pass — changing a
   rule requires editing the linter + the module map + an ADR together.

Skipping tests or docs is only acceptable when the user explicitly says so —
state it in your final report if that happens.
