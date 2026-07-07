/**
 * Normalized agent state. Every field the UI shows is either populated by a
 * collector (with a matching entry in `sources`) or left null — never invented.
 * `sources` maps field name -> 'real' | 'inferred'; absent means unavailable.
 */
export function emptyAgentState(id, name, icon) {
  return {
    id,
    name,
    icon,
    status: 'unknown',
    sessions: [],
    model: null,
    cwd: null,
    projectName: null,
    sessionId: null,
    effort: null,
    contextUsedPercent: null,
    tokens: { input: null, output: null, total: null, limit: null },
    costUsd: null,
    rateLimits: { shortWindowPercent: null, longWindowPercent: null, resetAt: null },
    lastActivityAt: null,
    lastEvent: null,
    needsApproval: false,
    error: null,
    sources: {},
    setupHint: null,
  };
}

/** Higher = more urgent; the agent-level status is the max across its sessions. */
export const STATUS_PRIORITY = {
  failed: 6,
  blocked: 5,
  needs_input: 4,
  waiting_approval: 3,
  running: 2,
  idle: 1,
  unknown: 0,
};

const ATTENTION_STATUSES = new Set(['needs_input', 'waiting_approval', 'blocked', 'failed']);

export function worstStatus(statuses) {
  let best = 'unknown';
  for (const s of statuses) {
    if ((STATUS_PRIORITY[s] ?? 0) > (STATUS_PRIORITY[best] ?? 0)) best = s;
  }
  return best;
}

export function projectNameFromCwd(cwd) {
  if (!cwd) return null;
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

export function shouldKeepSession(session, nowMs, retentionMs) {
  if (!session) return false;
  if (ATTENTION_STATUSES.has(session.status) || session.needsApproval || session.pendingInput) return true;
  if (!session.lastActivityAt) return true;
  return nowMs - new Date(session.lastActivityAt).getTime() <= retentionMs;
}

export function pruneInactiveSessions(agent, retentionMs, nowMs = Date.now()) {
  if (!agent?.sessions?.length) return agent;
  const sessions = agent.sessions.filter((session) => shouldKeepSession(session, nowMs, retentionMs));
  if (sessions.length === agent.sessions.length) return agent;

  const next = { ...agent, sessions };
  const newest = sessions[0] || null;
  if (!newest) {
    return {
      ...next,
      status: agent.status === 'failed' ? 'failed' : 'idle',
      cwd: null,
      projectName: null,
      sessionId: null,
      contextUsedPercent: null,
      tokens: { input: null, output: null, total: null, limit: null },
      costUsd: null,
      lastActivityAt: null,
      lastEvent: null,
      needsApproval: false,
    };
  }

  return {
    ...next,
    status: worstStatus(sessions.map((session) => session.status)),
    needsApproval: sessions.some((session) => session.needsApproval),
    model: newest.model ?? agent.model,
    effort: newest.effort ?? agent.effort ?? null,
    cwd: newest.cwd ?? null,
    projectName: newest.projectName ?? projectNameFromCwd(newest.cwd),
    sessionId: newest.sessionId ?? null,
    contextUsedPercent: newest.contextUsedPercent ?? null,
    tokens: newest.tokens ?? agent.tokens,
    lastActivityAt: newest.lastActivityAt ?? null,
    lastEvent: newest.lastEvent ?? null,
  };
}

/** Same shape as emptyAgentState, marked failed with the collector's error. */
export function errorAgentState(id, name, icon, err) {
  return {
    ...emptyAgentState(id, name, icon),
    status: 'failed',
    error: String(err?.message || err),
  };
}
