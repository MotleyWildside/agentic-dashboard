# Wiki Log

Newest first. One line per meaningful wiki change: date · pages · what/why.

- **2026-07-08** · `development/commands.md`, `package.json` · Added
  Electron app icon resources under `build/icon.*` (`.svg` source plus
  `.png`, `.icns`, `.ico`) and wired electron-builder to `build.icon`;
  covered by `test/electron-icon.test.ts`.

- **2026-07-08** · `decisions/ADR-0006-plugin-widget-renderers.md`, `wiki/index.md`,
  `plugins/plugin-system.md`, `plugins/adding-a-plugin.md`,
  `agents/agent-provider-contract.md`, `agents/normalized-agent-data.md`,
  `widgets/widget-system.md`, `architecture/extension-points.md`,
  `architecture/module-map.md`, `risks/architectural-risks.md` ·
  ADR-0006 **accepted & implemented**: plugin-defined widget renderers. Manifest
  gains `widgetType?` + `collectData?` (registry now accepts collect **or**
  collectData); snapshot gains a parallel `widgetData` channel
  (`server/lib/collect.ts`, failure-isolated); frontend gains a renderer registry
  (`src/ui/widgets/`) with a JSX-free `resolveWidgetType`, per-widget error
  boundary, and honest unknown-type fallback. Reference custom widget shipped
  (`example-pulse`). Retired architectural-risk #1 (single renderer). Tests:
  `test/collect.test.ts`, `test/widget-resolve.test.ts`, extended
  `test/registry.test.ts` + `data-only.js` fixture.

- **2026-07-08** · `widgets/widget-system.md`, `architecture/module-map.md` ·
  Small widgets now show dense session rows (count derived from widget height)
  instead of hiding sessions entirely; density logic extracted to pure
  `src/ui/lib/density.ts` (`cardDensity`, tested in `test/ui-density.test.ts`),
  grid row height unified as `GRID_ROW_PX` in `dashboard/layout.ts`.

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
