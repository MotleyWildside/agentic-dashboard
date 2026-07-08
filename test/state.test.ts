import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyAgentState,
  errorAgentState,
  worstStatus,
  shouldKeepSession,
  pruneInactiveSessions,
  aggregateFromSessions,
  projectNameFromCwd,
} from '../server/lib/state.ts';
import type { AgentSession } from '../shared/types.ts';

/** Partial session fixture — tests only set the fields under test. */
function session(fields: Partial<AgentSession>): AgentSession {
  return fields as AgentSession;
}

test('worstStatus picks the most urgent status', () => {
  assert.equal(worstStatus(['idle', 'running']), 'running');
  assert.equal(worstStatus(['running', 'needs_input', 'idle']), 'needs_input');
  assert.equal(worstStatus(['failed', 'needs_input']), 'failed');
  assert.equal(worstStatus([]), 'unknown');
  assert.equal(worstStatus(['not-a-status' as any]), 'unknown');
});

test('projectNameFromCwd returns the last path segment', () => {
  assert.equal(projectNameFromCwd('/Users/me/Work/my-project'), 'my-project');
  assert.equal(projectNameFromCwd('/Users/me/Work/my-project/'), 'my-project');
  assert.equal(projectNameFromCwd(null), null);
});

test('shouldKeepSession keeps attention states regardless of age', () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const retentionMs = 15 * 60 * 1000;
  assert.equal(shouldKeepSession(session({ status: 'needs_input', lastActivityAt: old }), Date.now(), retentionMs), true);
  assert.equal(shouldKeepSession(session({ status: 'idle', needsApproval: true, lastActivityAt: old }), Date.now(), retentionMs), true);
  assert.equal(shouldKeepSession(session({ status: 'idle', lastActivityAt: old }), Date.now(), retentionMs), false);
  assert.equal(shouldKeepSession(session({ status: 'idle', lastActivityAt: new Date().toISOString() }), Date.now(), retentionMs), true);
  // Sessions without a timestamp are never pruned (no evidence of staleness).
  assert.equal(shouldKeepSession(session({ status: 'idle' }), Date.now(), retentionMs), true);
});

test('pruneInactiveSessions drops stale idle sessions and re-aggregates', () => {
  const now = Date.now();
  const agent = {
    ...emptyAgentState('x', 'X', '◇'),
    status: 'running' as const,
    sessions: [
      session({ sessionId: 'fresh', status: 'running', lastActivityAt: new Date(now - 1000).toISOString(), cwd: '/w/fresh', projectName: 'fresh' }),
      session({ sessionId: 'stale', status: 'idle', lastActivityAt: new Date(now - 60 * 60 * 1000).toISOString() }),
    ],
  };
  const pruned = pruneInactiveSessions(agent, 15 * 60 * 1000, now);
  assert.equal(pruned.sessions.length, 1);
  assert.equal(pruned.sessions[0].sessionId, 'fresh');
  assert.equal(pruned.status, 'running');
  assert.equal(pruned.projectName, 'fresh');
});

test('pruneInactiveSessions with all sessions pruned resets summary fields', () => {
  const now = Date.now();
  const agent = {
    ...emptyAgentState('x', 'X', '◇'),
    status: 'running' as const,
    cwd: '/w/gone',
    sessions: [session({ sessionId: 'stale', status: 'idle', lastActivityAt: new Date(now - 60 * 60 * 1000).toISOString() })],
  };
  const pruned = pruneInactiveSessions(agent, 15 * 60 * 1000, now);
  assert.equal(pruned.sessions.length, 0);
  assert.equal(pruned.status, 'idle');
  assert.equal(pruned.cwd, null);
  assert.equal(pruned.sessionId, null);
});

test('aggregateFromSessions summarizes from newest session, status from worst', () => {
  const state = emptyAgentState('x', 'X', '◇');
  state.sessions = [
    session({ sessionId: 'a', status: 'idle', model: 'm1', cwd: '/w/a', projectName: 'a', contextUsedPercent: 12, lastEvent: 'e', lastActivityAt: '2026-01-01T00:00:00Z', effort: 'high' }),
    session({ sessionId: 'b', status: 'needs_input', model: 'm2', needsApproval: false }),
  ];
  aggregateFromSessions(state);
  assert.equal(state.status, 'needs_input'); // worst across sessions
  assert.equal(state.model, 'm1'); // details from newest (first)
  assert.equal(state.sessionId, 'a');
  assert.equal(state.effort, 'high');
  assert.equal(state.contextUsedPercent, 12);
});

test('aggregateFromSessions with no sessions leaves agent unknown', () => {
  const state = emptyAgentState('x', 'X', '◇');
  aggregateFromSessions(state);
  assert.equal(state.status, 'unknown');
  assert.equal(state.model, null);
});

test('errorAgentState marks the agent failed with the message', () => {
  const state = errorAgentState('x', 'X', '◇', new Error('boom'));
  assert.equal(state.status, 'failed');
  assert.equal(state.error, 'boom');
  assert.deepEqual(state.sessions, []);
});
