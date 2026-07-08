# Adding an Agent Provider — step by step

<!-- lint-docs-allow: opencode -->

Worked recipe for integrating a new agent (say, **OpenCode**). Total surface:
two new files, zero core changes.

## 1. Find the agent's local data source

Everything the dashboard shows must come from local files (or processes).
Investigate what the agent writes: session logs? state files? Where?
(`~/.opencode/…`?) Note the format and what's *really* in it — the provider
may only claim what it can read (`sources: real`) or honestly derive
(`inferred`).

If the directory should be configurable, add an env-driven path to
`server/config.ts` following the `claudeProjectsDir` pattern and document it
in `.env.example`.

## 2. Write the collector — `server/collectors/opencode.ts`

Skeleton (mirror `codex.ts`, the simpler reference):

```ts
import { config } from '../config.ts';
import { tailJsonl, ageSeconds } from '../lib/files.ts';
import { aggregateFromSessions, emptyAgentState, projectNameFromCwd } from '../lib/state.ts';
import type { AgentState, CollectContext } from '../../shared/types.ts';

export async function collectOpenCode(ctx: Partial<CollectContext> = {}): Promise<AgentState> {
  const isDismissed = ctx.isDismissed || (() => false);
  const state = emptyAgentState('opencode', 'OpenCode', '◇');

  // 1. list this agent's fresh session logs (≤ config.sessionRetentionS old)
  // 2. parse each into an AgentSession (newest first); skip isDismissed(id)
  // 3. push into state.sessions
  aggregateFromSessions(state);
  if (state.sessions.length) {
    state.sources = { sessionId: 'real', cwd: 'real', status: 'inferred', /* … */ };
  } else if (/* no data source found at all */ true) {
    state.setupHint = 'No OpenCode logs found in …; set OPENCODE_SESSIONS_DIR.';
  }
  return state;
}
```

Rules that matter (full list: [[agent-provider-contract]]): never invent data,
newest-first sessions, use `tailJsonl` (don't read whole logs), throw on real
failures (core renders them), set `pendingInput` + `needs_input` if you can
detect the agent waiting on the user.

## 3. Write the plugin — `server/plugins/opencode.ts`

Copy `server/plugins/_template.ts`:

```ts
import { collectOpenCode } from '../collectors/opencode.ts';
import type { AgentPlugin } from '../../shared/types.ts';

const plugin: AgentPlugin = {
  id: 'opencode',
  name: 'OpenCode',
  icon: '◇',
  matchProcess: (cmd) => /(^|\/)opencode( |$)/.test(cmd),
  collect: collectOpenCode,
};
export default plugin;
```

## 4. Run and verify

```bash
npm run scan          # one-shot: your provider's normalized output, printed
npm run dev           # dashboard; add an OpenCode widget via edit mode → ＋
npm test && npm run typecheck
```

The registry discovers the file automatically; the widget dialog lists it; a
widget instance enables polling. If the plugin misbehaves, expect a visible
`ERROR` card — not silence.

## 5. Test + document

- Parsing logic worth keeping correct → a `test/opencode.test.ts` with fixture
  log files (pattern: `test/files.test.ts` temp-dir writes).
- Update [[module-map]] (one table row) and [[log]]. Contract untouched → no ADR.
