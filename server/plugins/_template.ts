// Template for adding a new agent plugin (e.g. OpenCode, Antigravity).
// Files prefixed with "_" are skipped by the registry scanner — copy this
// file to a name without the underscore (e.g. opencode.ts) to register it.
//
// The contract is the AgentPlugin type in shared/types.ts:
//   id       — unique, url-safe string (used as a key everywhere: settings,
//              dismissed sessions, CSS classes, SSE events)
//   name     — display name shown on the card
//   icon     — single glyph/emoji fallback, used when `logo` is absent or
//              hasn't loaded yet on the frontend
//   logo     — optional inline SVG string (no remote assets)
//   layout   — optional dashboard widget sizing defaults/limits:
//              { minW, minH, defaultW, defaultH, maxW, maxH } in grid units.
//   matchProcess — optional (cmd: string) => boolean, tested against every
//              `ps` command line each poll. When it matches a live process,
//              an agent whose status is 'unknown' is upgraded to 'idle'
//              ("installed & running, just no fresh logs"). Throwing is safe:
//              a broken matcher is treated as no-match.
//   collect  — async (ctx) => AgentState, called every poll. Build the
//              return value with emptyAgentState(id, name, icon) from
//              ../lib/state.ts and fill in whatever fields you have real
//              data for — never invent values, leave them null instead.
//              ctx.isDismissed(sessionId) returns true if the user hid that
//              session from the dashboard; filter it out of `sessions`
//              before computing agent-level aggregates.
//
// Optional per-session field:
//   session.pendingInput = { tool: 'AskUserQuestion', questions: [...] }
//   Set session.status = 'needs_input' when the agent is blocked waiting on
//   a user answer it can't get from the dashboard (see claude.ts/collectors
//   for a worked example). This lights up the card yellow.

// import { collectOpenCode } from '../collectors/opencode.ts';
// import type { AgentPlugin } from '../../shared/types.ts';
//
// const plugin: AgentPlugin = {
//   id: 'opencode',
//   name: 'OpenCode',
//   icon: '◇',
//   layout: { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 },
//   matchProcess: (cmd) => /(^|\/)opencode( |$)/.test(cmd),
//   collect: collectOpenCode,
// };
//
// export default plugin;
