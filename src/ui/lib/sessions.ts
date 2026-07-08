import type { AgentSession } from '../../../shared/types.ts';

/** Pure session helpers — no React, unit-tested in test/ui-sessions.test.ts. */

export const ACTIVE_STATUSES = new Set(['running', 'needs_input', 'waiting_approval', 'blocked', 'failed']);

export function effortLabel(effort: AgentSession['effort'] | undefined): string | null {
  if (!effort) return null;
  if (typeof effort === 'string') return effort;
  return effort.level || effort.type || effort.name || null;
}

export function isActiveSession(session: AgentSession): boolean {
  return ACTIVE_STATUSES.has(session?.status) || session?.needsApproval;
}

export function sessionKey(session: AgentSession): string | null | undefined {
  return session?.threadId || session?.sessionId;
}

export function sessionLabel(session: AgentSession): string {
  if (session?.threadSource === 'subagent') {
    return session.agentNickname || session.agentRole || 'sub-agent';
  }
  return session?.projectName || 'session';
}

export interface SessionRow {
  session: AgentSession;
  depth: number;
}

/** Orders sessions for display: subagent sessions nest (depth 1) under their
 * parent thread when the parent is present; everything else is a root row. */
export function buildSessionRows(sessions: AgentSession[]): SessionRow[] {
  const byId = new Map<string, AgentSession>();
  for (const session of sessions) {
    const key = sessionKey(session);
    if (key) byId.set(key, session);
  }

  const childrenByParent = new Map<string | null | undefined, AgentSession[]>();
  const roots: AgentSession[] = [];
  for (const session of sessions) {
    const parentId = session.parentThreadId;
    if (session.threadSource === 'subagent' && parentId && byId.has(parentId)) {
      const children = childrenByParent.get(parentId) || [];
      children.push(session);
      childrenByParent.set(parentId, children);
    } else {
      roots.push(session);
    }
  }

  const rows: SessionRow[] = [];
  for (const root of roots) {
    rows.push({ session: root, depth: 0 });
    const children = childrenByParent.get(sessionKey(root)) || [];
    for (const child of children) rows.push({ session: child, depth: 1 });
  }
  return rows;
}
