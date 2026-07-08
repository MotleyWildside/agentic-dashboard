# Wiki Schema — rules for maintaining this knowledge base

These are the operating rules for **future agents and humans** who touch this
knowledge base. The wiki is maintained like a codebase: accurate, reviewed,
refactored — never left to rot.

## When to update the wiki

Update in the **same change set** as the code when you:

- change architecture, module boundaries, or data flow → update the matching page
  under `wiki/architecture/`;
- change the plugin contract or registry → `wiki/plugins/plugin-system.md` and
  `wiki/agents/agent-provider-contract.md`, plus `server/plugins/_template.ts`;
- add/remove a provider → `wiki/agents/`, and the module map;
- change the widget instance shape, validation, or grid behavior → `wiki/widgets/`;
- change theme schema/tokens/loading → `wiki/themes/` (and `shared/theme-schema.ts`
  stays the single source of truth — docs describe it, never fork it);
- change any persisted file format (settings.json, dismissed.json, theme stores) →
  `wiki/settings/settings-and-persistence.md`;
- add/rename npm scripts or change the test setup → `wiki/development/`;
- make a non-trivial architectural decision → add an ADR (below).

If a change doesn't fit an existing page, prefer **extending an existing page** over
creating a near-duplicate. Create a new page only for a genuinely new concept.

## How to add a page

1. Put it in the right `wiki/<area>/` folder, kebab-case filename, one concept per file.
2. Start with a one-paragraph summary, then (where useful): *Why this exists*,
   the facts (with **real file paths**), and *How to safely change this*.
3. Link related pages with `[[wikilinks]]` and/or relative Markdown links.
4. Add the page to [wiki/index.md](wiki/index.md).
5. Append a line to [wiki/log.md](wiki/log.md): date, page, what changed, why.

## How to record a decision (ADR)

Create `wiki/decisions/ADR-NNNN-short-title.md` with: **Status** (accepted /
superseded-by-NNNN), **Context**, **Decision**, **Consequences**. ADRs are
append-only history — never rewrite an accepted ADR; supersede it.

## Layer rules

- `raw/` (layer 1): original analysis and research. Append new dated files; don't
  rewrite old ones. Raw notes may be wrong or stale — the wiki is the truth.
- `wiki/` (layer 2): must match the **current code**. If code and wiki disagree,
  the wiki has a bug — fix it.
- `schema.md` (layer 3, this file): change only when the maintenance process itself
  changes.

## Answering architecture questions

When asked how something works: read the relevant wiki page(s) first, verify any
load-bearing claim against the referenced source files, answer, and if you found a
discrepancy — fix the wiki page in the same session.

## Wiki health check

Most of this is automated: `npm run lint:docs` (see
[wiki/development/linting.md](wiki/development/linting.md)) checks links,
wikilinks, orphans, stale path references, and ADR indexing — and runs inside
`npm test`. The manual part that remains:

1. **Semantic staleness**: named exports/behaviors a page describes still work
   as described (the linter only checks that paths exist).
2. **Contradictions**: pages describing the same mechanism must agree; merge or fix.
3. **Missing concepts**: new top-level directories or exports in `server/`, `src/`,
   `shared/`, `electron/` that no page mentions are documentation debt.
4. Log the check and fixes in [wiki/log.md](wiki/log.md).

## Style

- Small files, concrete file paths, tables for mappings, Mermaid for flows.
- Describe the code **as it is**, not as it should be. Aspirations belong in
  [wiki/risks/architectural-risks.md](wiki/risks/architectural-risks.md) or an ADR's
  "Consequences".
