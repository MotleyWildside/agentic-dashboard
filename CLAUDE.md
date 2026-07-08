# CLAUDE.md

Follow [AGENTS.md](AGENTS.md).

The short version: this repo's compiled understanding lives in the knowledge
base — **read [docs/knowledge-base/00-agent-entrypoint.md](docs/knowledge-base/00-agent-entrypoint.md)
before exploring the code**, answer architecture questions from
[docs/knowledge-base/wiki/index.md](docs/knowledge-base/wiki/index.md), and
update the wiki (rules: [docs/knowledge-base/schema.md](docs/knowledge-base/schema.md))
in the same change whenever you alter architecture, contracts, persisted
formats, plugins, widgets, or themes.

**Mandatory development protocol** (details in AGENTS.md): every change ships
with (1) new/updated tests for the changed behavior, (2) updated
knowledge-base documentation + a `wiki/log.md` entry, and (3) green
verification — `npm test` · `npm run typecheck` · `npm run lint` (docs +
architecture guardrails) · plus `npm run build` for any `src/` change (the
`public/` bundle is committed). A change without tests and docs is not done,
and lint rules may only be changed together with the module map and an ADR.
