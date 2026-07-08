# Wiki Log

Newest first. One line per meaningful wiki change: date · pages · what/why.

- **2026-07-08** · `architecture/module-map.md`, `architecture/state-flow.md`,
  `architecture/overview.md`, `architecture/data-flow.md`,
  `architecture/extension-points.md`, `agents/normalized-agent-data.md`,
  `widgets/widget-system.md`, `widgets/adding-a-widget.md`,
  [[theme-json-schema]], [[architectural-risks]] · Frontend
  refactor: split the 1400-line `src/ui/App.tsx` into feature modules
  (`lib/`, `components/`, `hooks/`, `dashboard/`, `agent-card/`, `settings/`);
  pure logic extracted and unit-tested (`test/ui-*.test.ts`). Resolves risk #7.
  Kept plain hooks — no state library (zustand considered, declined; see
  state-flow.md).
- **2026-07-08** · `development/linting.md` (new), `development/commands.md`,
  `development/testing.md`, `schema.md`, `index.md`, ADR-0005 · Added guardrail
  linters (`npm run lint`): docs freshness + architecture boundary rules,
  wired into `npm test` (harness-engineering approach).
- **2026-07-08** · `development/workflows.md`, `development/testing.md` (+ root
  `AGENTS.md`/`CLAUDE.md`) · Made the development protocol explicit and
  mandatory: every change must extend tests AND update documentation in the
  same change, per user directive.

- **2026-07-08** · *all pages* · Knowledge base created (WikiLLM three-layer
  model). Seeded from the initial architecture analysis
  ([../raw/2026-07-08-initial-architecture-analysis.md](../raw/2026-07-08-initial-architecture-analysis.md)),
  written against the codebase **after** the same-day refactors: shared theme
  schema (ADR-0002), plugin process matchers + testability extraction
  (ADR-0003), TypeScript migration (ADR-0004), `node:test` suite, honest
  connection state / dev-only mocks.
