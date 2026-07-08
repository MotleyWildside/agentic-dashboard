import type { AgentSession, AgentState, AgentStatus } from '../../shared/types.ts';

/**
 * Normalized agent state. Every field the UI shows is either populated by a
 * collector (with a matching entry in `sources`) or left null — never invented.
 * `sources` maps field name -> 'real' | 'inferred' | 'manual'; absent means unavailable.
 * The shape itself is defined once in shared/types.ts (AgentState).
 */
export function emptyAgentState(id: string, name: string, icon: string): AgentState {
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
export const STATUS_PRIORITY: Record<AgentStatus, number> = {
  failed: 6,
  blocked: 5,
  needs_input: 4,
  waiting_approval: 3,
  running: 2,
  idle: 1,
  unknown: 0,
};

const ATTENTION_STATUSES = new Set<AgentStatus>(['needs_input', 'waiting_approval', 'blocked', 'failed']);

export function worstStatus(statuses: Iterable<AgentStatus>): AgentStatus {
  let best: AgentStatus = 'unknown';
  for (const s of statuses) {
    if ((STATUS_PRIORITY[s] ?? 0) > (STATUS_PRIORITY[best] ?? 0)) best = s;
  }
  return best;
}

export function projectNameFromCwd(cwd: string | null | undefined): string | null {
  if (!cwd) return null;
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

export function shouldKeepSession(
  session: AgentSession | null | undefined,
  nowMs: number,
  retentionMs: number
): boolean {
  if (!session) return false;
  if (ATTENTION_STATUSES.has(session.status) || session.needsApproval || session.pendingInput) return true;
  if (!session.lastActivityAt) return true;
  return nowMs - new Date(session.lastActivityAt).getTime() <= retentionMs;
}

export function pruneInactiveSessions(
  agent: AgentState,
  retentionMs: number,
  nowMs: number = Date.now()
): AgentState {
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

/**
 * Fill agent-level summary fields from state.sessions (newest first):
 * status = most urgent across sessions, everything else from the newest
 * session. Collectors call this after building sessions, then layer on any
 * agent-specific extras (cost sums, rate limits, sources labels).
 * With no sessions the agent stays 'unknown'.
 */
export function aggregateFromSessions(state: AgentState): AgentState {
  const newest = state.sessions[0];
  if (!newest) {
    state.status = 'unknown';
    return state;
  }
  state.status = worstStatus(state.sessions.map((s) => s.status));
  state.needsApproval = state.sessions.some((s) => s.needsApproval);
  state.model = newest.model;
  state.effort = newest.effort ?? null;
  state.cwd = newest.cwd;
  state.projectName = newest.projectName;
  state.sessionId = newest.sessionId;
  state.contextUsedPercent = newest.contextUsedPercent;
  state.tokens = newest.tokens;
  state.lastEvent = newest.lastEvent;
  state.lastActivityAt = newest.lastActivityAt;
  return state;
}

/** Same shape as emptyAgentState, marked failed with the collector's error. */
export function errorAgentState(id: string, name: string, icon: string, err: unknown): AgentState {
  return {
    ...emptyAgentState(id, name, icon),
    status: 'failed',
    error: String((err as any)?.message || err),
  };
}
