# ADR-0001 — Architecture baseline

**Status**: accepted (documents pre-existing decisions, recorded 2026-07-08)

## Context

The dashboard predates this knowledge base. Its foundational choices were made
implicitly; this ADR records them so future changes argue against explicit
rationale instead of guessing.

## Decisions

1. **Local-first, read-only, zero-trust-free**: bind `127.0.0.1`, read local
   agent logs read-only, no network calls, no auth (localhost is the trust
   boundary). Chosen for privacy and zero setup.
2. **Poll + SSE, no watchers/websockets**: a 2 s poll of file mtimes/tails is
   simple, robust across editors/filesystems, and cheap at this scale;
   SSE is sufficient for one-directional snapshot push.
3. **Zero runtime dependencies on the server**: plain `node:http`. Keeps the
   attack/maintenance surface tiny; the server must run for months unattended.
4. **File-scan plugin registry**: agents integrate as modules in
   `server/plugins/`, discovered at boot, no registration file. One-file
   integration beats configuration ceremony at this project size.
5. **Never invent data**: every field carries provenance
   (`real`/`inferred`/`manual`) or renders as unavailable. This is a product
   invariant, not a style preference.
6. **Widget-derived plugin enablement**: a plugin is polled iff it has a
   widget on the dashboard. One mental model ("what's on my dashboard runs"),
   no separate enable/disable state to drift.
7. **Committed frontend build** (`public/`): `npm start` works with zero build
   step on a fresh clone — the dashboard's own UX beats repo hygiene here.
8. **React + MUI + react-grid-layout frontend**: replaced the original plain
   HTML/CSS/JS frontend before this KB existed; grid composition and theming
   come mostly free.

## Consequences

- Status is a recency *heuristic* and is labelled `inferred` (a silent 30 s
  tool call reads as IDLE) — accepted trade-off of decision 2.
- Committed `public/` (decision 7) means stale-bundle mistakes are possible;
  mitigated by loud docs ([[commands]]).
- No auth (decision 1) means `HOST=0.0.0.0` would expose session metadata —
  documented as a risk, deliberately not "fixed" with auth machinery.
