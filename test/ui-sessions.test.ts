import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentSession } from '../shared/types.ts';
import { buildSessionRows, effortLabel, isActiveSession, sessionLabel } from '../src/ui/lib/sessions.ts';

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    sessionId: 's1',
    status: 'idle',
    projectName: 'proj',
    ...overrides,
  } as AgentSession;
}

test('buildSessionRows nests subagents under their parent thread', () => {
  const parent = session({ threadId: 't1', projectName: 'main' });
  const child = session({ threadId: 't2', parentThreadId: 't1', threadSource: 'subagent', agentNickname: 'worker' });
  const other = session({ threadId: 't3', projectName: 'other' });

  const rows = buildSessionRows([parent, child, other]);
  assert.deepEqual(
    rows.map((row) => [row.session.threadId, row.depth]),
    [['t1', 0], ['t2', 1], ['t3', 0]],
  );
});

test('buildSessionRows treats orphan subagents as roots', () => {
  const orphan = session({ threadId: 't9', parentThreadId: 'missing', threadSource: 'subagent' });
  const rows = buildSessionRows([orphan]);
  assert.deepEqual(rows, [{ session: orphan, depth: 0 }]);
});

test('isActiveSession covers active statuses and approval flag', () => {
  assert.ok(isActiveSession(session({ status: 'running' })));
  assert.ok(isActiveSession(session({ status: 'waiting_approval' })));
  assert.ok(isActiveSession(session({ status: 'idle', needsApproval: true })));
  assert.ok(!isActiveSession(session({ status: 'idle' })));
});

test('sessionLabel prefers subagent identity, then project name', () => {
  assert.equal(sessionLabel(session({ threadSource: 'subagent', agentNickname: 'nick' })), 'nick');
  assert.equal(sessionLabel(session({ threadSource: 'subagent', agentRole: 'reviewer' })), 'reviewer');
  assert.equal(sessionLabel(session({ threadSource: 'subagent' })), 'sub-agent');
  assert.equal(sessionLabel(session({ projectName: 'proj' })), 'proj');
  assert.equal(sessionLabel(session({ projectName: undefined })), 'session');
});

test('effortLabel handles strings, objects, and absence', () => {
  assert.equal(effortLabel(undefined), null);
  assert.equal(effortLabel('high' as AgentSession['effort']), 'high');
  assert.equal(effortLabel({ level: 'medium' } as AgentSession['effort']), 'medium');
  assert.equal(effortLabel({} as AgentSession['effort']), null);
});
