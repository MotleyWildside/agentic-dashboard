# Guardrail Linters

Two custom zero-dependency linters encode this project's documentation and
architecture rules as **machine-checkable invariants** (ADR-0005), so drift is
caught mechanically instead of relying on reviewers remembering prose. Run
both with `npm run lint`; they also run inside `npm test`
(`test/linters.test.ts`), so a stale doc or boundary violation fails the suite.

## `npm run lint:docs` — `scripts/lint-docs.ts`

Automates the wiki health check from [../../schema.md](../../schema.md) over
the knowledge base plus `AGENTS.md`, `CLAUDE.md`, `README.md`,
`docs/agent-plugins.md`:

1. Relative Markdown links resolve to existing files.
2. `[[wikilinks]]` resolve to an existing KB page (code spans are ignored).
3. No orphan wiki pages — everything under `wiki/` is listed in [[index]].
4. **Stale-reference check**: backticked repo paths (`server/…`, `src/…`, …)
   must exist on disk. Fenced code blocks are exempt (examples aren't claims);
   `raw/` and `wiki/decisions/` are exempt (historical layers legitimately
   name old paths).
5. Every ADR file is listed in [[index]].

Escape hatch for deliberately hypothetical paths in worked examples — put in
the page: `<!-- lint-docs-allow: opencode -->` (space-separated substrings).

## `npm run lint:arch` — `scripts/lint-arch.ts`

Enforces the boundary rules from [[module-map]]:

| Rule | Invariant |
|---|---|
| R1 | `shared/` is dependency-free (only relative imports within itself) |
| R2 | `src/` never imports server code; `server/` never imports frontend code |
| R3 | collectors don't import plugins, the registry, or `server/index.ts` |
| R4 | plugin files don't import other plugins, the registry, or `server/index.ts` |
| R5 | no agent id literals (`'claude'`/`'codex'`) in core code (`server/index.ts`, `server/lib/`, `src/ui/`, `src/main.tsx`, `src/theme/`) |
| R6 | no hardcoded hex colors in UI components — theme tokens only |
| R7 | `server/lib/` doesn't import plugins or collectors (agent-agnostic core) |

## Changing a rule

A rule is a documented decision, not an obstacle. To change one, do all three
in a single change: edit the linter, update [[module-map]] (or
[../../schema.md](../../schema.md) for docs rules), and add/extend an ADR
explaining why. Never weaken a rule ad hoc to make a change pass.

## When you add a new invariant

Any time a review comment or bug is of the form "we never do X here", consider
encoding it as a lint rule instead of (only) prose — that's the point of the
harness: the next agent can't drift what the machine checks.
