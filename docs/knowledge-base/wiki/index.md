# Wiki Index

The maintained knowledge base for Mimiron. Rules for editing:
[../schema.md](../schema.md). New here? Start with the
[architecture overview](architecture/overview.md).

## Architecture
- [[overview]] — [architecture/overview.md](architecture/overview.md): what the system is, big picture diagram
- [[module-map]] — [architecture/module-map.md](architecture/module-map.md): every directory/module, its responsibility and dependencies
- [[data-flow]] — [architecture/data-flow.md](architecture/data-flow.md): log files → collectors → snapshot → SSE → UI
- [[state-flow]] — [architecture/state-flow.md](architecture/state-flow.md): where state lives on server and client
- [[runtime-boundaries]] — [architecture/runtime-boundaries.md](architecture/runtime-boundaries.md): server / browser / Electron / TS execution model
- [[extension-points]] — [architecture/extension-points.md](architecture/extension-points.md): every supported way to extend the dashboard

## Plugins & agents
- [[plugin-system]] — [plugins/plugin-system.md](plugins/plugin-system.md): registry, manifest, lifecycle, failure isolation, settings
- [[adding-a-plugin]] — [plugins/adding-a-plugin.md](plugins/adding-a-plugin.md)
- [[agent-provider-contract]] — [agents/agent-provider-contract.md](agents/agent-provider-contract.md): the AgentPlugin contract
- [[normalized-agent-data]] — [agents/normalized-agent-data.md](agents/normalized-agent-data.md): AgentState/AgentSession model + provenance labels
- [[adding-an-agent-provider]] — [agents/adding-an-agent-provider.md](agents/adding-an-agent-provider.md): step-by-step recipe

## Widgets
- [[widget-system]] — [widgets/widget-system.md](widgets/widget-system.md): widget instances, grid, server validation
- [[adding-a-widget]] — [widgets/adding-a-widget.md](widgets/adding-a-widget.md)

## Themes
- [[theme-system]] — [themes/theme-system.md](themes/theme-system.md): packs, adapters, two persistence backends
- [[theme-json-schema]] — [themes/theme-json-schema.md](themes/theme-json-schema.md): the theme pack format
- [[adding-a-theme]] — [themes/adding-a-theme.md](themes/adding-a-theme.md)

## Settings & persistence
- [[settings-and-persistence]] — [settings/settings-and-persistence.md](settings/settings-and-persistence.md): every persisted file and who owns it

## Development
- [[commands]] — [development/commands.md](development/commands.md): dev/test/build/package commands
- [[testing]] — [development/testing.md](development/testing.md): test setup and what's covered
- [[workflows]] — [development/workflows.md](development/workflows.md): feature & architecture-change workflows
- [[linting]] — [development/linting.md](development/linting.md): guardrail linters for docs & architecture boundaries

## Decisions (ADRs)
- [ADR-0001](decisions/ADR-0001-architecture-baseline.md) — architecture baseline
- [ADR-0002](decisions/ADR-0002-shared-theme-schema.md) — single shared theme schema module
- [ADR-0003](decisions/ADR-0003-plugin-process-matchers-and-testability.md) — plugin process matchers + testability extraction
- [ADR-0004](decisions/ADR-0004-typescript-migration.md) — TypeScript migration & dual execution model
- [ADR-0005](decisions/ADR-0005-guardrail-linters.md) — guardrail linters for docs and architecture
- [ADR-0006](decisions/ADR-0006-plugin-widget-renderers.md) — plugin-defined widget renderers (custom widget types)

## Meta
- [[architectural-risks]] — [risks/architectural-risks.md](risks/architectural-risks.md): known sharp edges, honestly stated
- [[glossary]] — [glossary.md](glossary.md)
- [[log]] — [log.md](log.md): wiki change history
