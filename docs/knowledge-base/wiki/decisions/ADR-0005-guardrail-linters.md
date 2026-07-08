# ADR-0005 — Guardrail linters for docs and architecture

**Status**: accepted (2026-07-08)

## Context

This project is developed largely by AI agents. Its architectural rules
(module boundaries, "no agent knowledge in core", theme-tokens-only UI) and
its documentation-freshness rules lived only as prose in the knowledge base —
and prose drifts: an agent that never reads the right page can violate a
boundary without any signal. The "harness engineering" approach
(https://openai.com/index/harness-engineering/) argues for encoding such
intent as machine-checkable rules with fast deterministic feedback, so the
environment itself keeps agents inside the rails.

## Decision

Two custom zero-dependency linters, run via `npm run lint` and embedded in the
test suite (`test/linters.test.ts`) so `npm test` fails on violations:

- **`scripts/lint-docs.ts`** — automates the wiki health check: broken
  links/wikilinks, orphan pages, ADRs missing from the index, and stale repo
  paths referenced in docs. Historical layers (`raw/`, `wiki/decisions/`) and
  fenced code examples are exempt; `<!-- lint-docs-allow: … -->` marks
  deliberate hypothetical paths.
- **`scripts/lint-arch.ts`** — enforces the module-map boundary rules
  (R1–R7): shared/ dependency-free, src↔server isolation, collector/plugin/lib
  layering, no plugin-id literals in core, no hex colors in UI components.

No ESLint/Prettier adopted: generic style linting isn't the goal (and would
add dependencies); the goal is *project-specific* invariants. Rule changes
require editing the linter + the module map/schema + an ADR in one change.

## Consequences

- Architecture drift and stale docs now fail `npm test` — the feedback loop
  is seconds, not review cycles.
- The docs linter forces the wiki to stay synchronized with file renames
  (it caught three stale references at introduction time).
- False positives are handled by explicit, visible escape hatches (allow
  directives, historical-layer exemptions) rather than by weakening rules.
- New invariants should preferentially be added as lint rules
  ([[linting]] § "when you add a new invariant").
