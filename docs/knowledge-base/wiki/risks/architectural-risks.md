# Architectural Risks

Known sharp edges, honestly stated. When you fix one, move it to the relevant
page + ADR and delete it here.

## 1. Single widget renderer (medium, most likely to bite next)

All widgets render `AgentCard`; a plugin cannot ship a custom renderer or a
non-agent widget (e.g. a rate-limit summary across agents). The frontend is a
static bundle, so a real widget-type registry implies either bundling all
renderers or a frontend build per plugin set. Don't ad-hoc this — ADR first.
See [[widget-system]].

## 2. Two unsynchronized theme stores (low)

Electron userData vs browser localStorage ([[theme-system]]). A user switching
between `npm start` in a browser and the Electron app sees different custom
themes/selection. Validation is shared (ADR-0002); persistence is not. A fix
would move theme persistence into the dashboard server; nobody has needed it
yet.

## 3. Status is a write-recency heuristic (accepted, by design)

`running` = log written < 20 s ago. Long silent tool calls show IDLE;
approval-waiting in Claude Code is not reliably detectable from transcripts
(only Codex approval events are). Labelled `inferred` everywhere. Mitigations
live in agent-side reporters/hooks, not in cleverer polling. ADR-0001.

## 4. Third-party log formats can shift under us (medium)

Collectors parse undocumented Claude/Codex file formats. A format change
degrades silently to `unknown`/missing fields (never crashes — isolation is
tested), but nothing *alerts*. After agent app updates, run `npm run scan`
and eyeball. There are no fixture tests against real transcript samples —
adding sanitized fixtures would be the highest-value test improvement.

## 5. Committed `public/` bundle can go stale (low, recurring annoyance)

A `src/` change without `npm run build` ships an old UI via `npm start`/
Electron while `npm run dev` looks fine. No CI exists to catch it. Ritual:
build + commit together ([[commands]]).

## 6. `server/index.ts` boots on import (low)

Importing the module starts the server + poll loop (the Electron shell relies
on this via `ready`). It keeps the HTTP layer untestable — logic keeps being
extracted to `server/lib/*` instead (the established pattern; see [[testing]]).
A `createServer()` factory would fix it properly if the file grows again.

## 7. No auth on the API (accepted)

Localhost binding *is* the security model. `HOST=0.0.0.0` exposes session
metadata (cwds, question texts) to the network unauthenticated. Documented in
README; deliberately not mitigated with auth machinery (ADR-0001).

## 8. Plugins run with full server privileges (accepted, keep it visible)

No sandbox; the registry only loads from the repo's own directory, so adding a
plugin is a reviewed code change. If a user-writable plugin dir is ever added,
that decision needs a real threat model + ADR. See [[plugin-system]].

## 9. Legacy `settings.plugins` key (trivial)

Accepted by POST, stored, never read. Remove the write path once no old
clients matter; until then it's documented dead weight
([[settings-and-persistence]]).
