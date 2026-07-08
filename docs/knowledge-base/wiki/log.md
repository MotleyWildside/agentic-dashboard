# Wiki Log

Newest first. One line per meaningful wiki change: date · pages · what/why.

- **2026-07-08** · `development/commands.md`,
  `architecture/module-map.md` · Added `scripts/round-app-icon.cjs` and
  documented that Electron app icon assets must keep a real transparent
  rounded-corner alpha mask before regenerating native containers, so copied
  macOS app bundles do not show a square white icon.

- **2026-07-08** · `development/commands.md`,
  `settings/settings-and-persistence.md`, `architecture/module-map.md`,
  root `README.md` · Added Electron startup prompt plus manual
  `npm run setup:claude` for Claude Code statusLine setup. After confirmation,
  setup copies Mimiron's shell wrapper to `~/.agent-dashboard/`; when a custom
  statusLine already exists, setup wraps it so Mimiron captures live limits/cost
  while preserving the user's terminal statusline output without requiring
  `node` on Claude Code's PATH. Claude collector also reads the wrapper's raw
  statusLine payload directly, so account-level limits survive session-id
  mismatches. Set `MIMIRON_SKIP_CLAUDE_STATUSLINE_SETUP=1` to skip startup
  checks.

- **2026-07-08** · `development/commands.md`, root `README.md` · macOS
  Electron packaging now runs an `afterPack` hook that ad-hoc signs the `.app`
  bundle, preventing invalid "damaged" app signatures while still documenting
  that public distribution requires notarization.

- **2026-07-08** · `runtime-boundaries.md`, `development/commands.md` ·
  Packaged Electron now sets `PORT=0`, letting the OS assign a free loopback
  port and avoiding collisions/accidental attachment to old dashboard servers.

- **2026-07-08** · `agents/agent-provider-contract.md`,
  `plugins/plugin-system.md`, `plugins/adding-a-plugin.md` · Bundled Claude and
  Codex logos now surface as data URLs in plugin metadata so packaged Electron
  builds do not depend on a separate static asset request.

- **2026-07-08** · `log.md` · Codex uses the new bundled color PNG logo, and
  image-backed agent logos render without the extra card-icon border.

- **2026-07-08** · `00-agent-entrypoint.md`, `README.md`, `wiki/index.md`,
  `architecture/overview.md`, root `README.md`, app metadata · Renamed the
  application brand from Agentic Dashboard / Agent Control to Mimiron across the
  source app shell, Electron/package metadata, server startup banner, and docs.

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

- **2026-07-08** · `agents/agent-provider-contract.md`,
  `plugins/plugin-system.md` · Plugin logos may now be either inline SVG or
  local `/plugin-assets/...` image URLs. Claude/Codex manifests use bundled
  webp logo assets served by the Node server; frontend logo renderers support
  both forms and registry tests verify the bundled files exist.

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
