import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { tailJsonl, headJsonl, readJsonSync, ageSeconds, type JsonlLine } from '../lib/files.ts';
import { aggregateFromSessions, emptyAgentState, projectNameFromCwd } from '../lib/state.ts';
import type { AgentSession, AgentState, CollectContext } from '../../shared/types.ts';

/**
 * Codex collector — multi-session.
 *
 * Codex (CLI + Desktop) writes one rollout log per session to
 *   ~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl
 * All rollouts touched within SESSION_RETENTION_S are parsed as dashboard sessions.
 *
 * REAL per session: cwd/session id (session_meta), model/effort (turn_context),
 * exact tokens + context window (token_count events).
 * REAL per account: rate limits (token_count.rate_limits) — taken from the
 * most recently updated session.
 * INFERRED: status (write recency; trailing *_approval_request event).
 * UNAVAILABLE: cost in USD — Codex does not record it; left null.
 */

const MAX_SESSIONS = 20;

async function recentDayDirs(root: string, maxDays = 4): Promise<string[]> {
  const out: string[] = [];
  let years: string[];
  try {
    years = (await fs.readdir(root)).filter((n) => /^\d{4}$/.test(n)).sort().reverse();
  } catch {
    return out;
  }
  for (const y of years) {
    const months = (await fs.readdir(path.join(root, y)).catch(() => [] as string[]))
      .filter((n) => /^\d{2}$/.test(n)).sort().reverse();
    for (const m of months) {
      const days = (await fs.readdir(path.join(root, y, m)).catch(() => [] as string[]))
        .filter((n) => /^\d{2}$/.test(n)).sort().reverse();
      for (const d of days) {
        out.push(path.join(root, y, m, d));
        if (out.length >= maxDays) return out;
      }
    }
  }
  return out;
}

interface RolloutFile {
  path: string;
  mtimeMs: number;
}

async function listRollouts(): Promise<RolloutFile[]> {
  const files: RolloutFile[] = [];
  for (const dir of await recentDayDirs(config.codexSessionsDir)) {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.startsWith('rollout-') || !name.endsWith('.jsonl')) continue;
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.isFile()) files.push({ path: full, mtimeMs: stat.mtimeMs });
      } catch { /* raced away */ }
    }
  }
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files;
}

function describeEvent(line: JsonlLine): string | null {
  if (!line) return null;
  const p = line.payload || {};
  if (line.type === 'event_msg') {
    switch (p.type) {
      case 'agent_message': return 'assistant replied';
      case 'agent_reasoning': return 'reasoning';
      case 'token_count': return 'token update';
      case 'task_started': return 'task started';
      case 'task_complete': return 'task complete';
      case 'turn_aborted': return 'turn aborted';
      case 'exec_command_begin': return 'running command';
      case 'exec_command_end': return 'command finished';
      default: return p.type || 'event';
    }
  }
  if (line.type === 'response_item') {
    switch (p.type) {
      case 'function_call': return `tool: ${p.name || 'call'}`;
      case 'function_call_output': return 'tool result received';
      case 'message': return p.role === 'user' ? 'user message' : 'assistant message';
      case 'reasoning': return 'reasoning';
      default: return p.type || 'response';
    }
  }
  if (line.type === 'turn_context') return 'turn started';
  return line.type || null;
}

function effortFromTurnContext(payload: any = {}): string | null {
  return (
    payload.effort ||
    payload.reasoning_effort ||
    payload.collaboration_mode?.settings?.reasoning_effort ||
    null
  );
}

async function parseSession(file: RolloutFile): Promise<AgentSession | null> {
  let lines: JsonlLine[];
  try {
    lines = await tailJsonl(file.path);
  } catch {
    return null;
  }
  if (!lines.length) return null;

  let meta = lines.find((l) => l.type === 'session_meta')?.payload;
  if (!meta) meta = (await headJsonl(file.path).catch(() => null))?.payload;

  let lastTokenCount: JsonlLine | null = null;
  let lastTurnContext: JsonlLine | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (!lastTokenCount && l.type === 'event_msg' && l.payload?.type === 'token_count') lastTokenCount = l;
    if (!lastTurnContext && l.type === 'turn_context') lastTurnContext = l;
    if (lastTokenCount && lastTurnContext) break;
  }
  const lastLine = lines[lines.length - 1];
  const approvalPending =
    !!lastLine?.payload?.type && String(lastLine.payload.type).includes('approval');
  const age = ageSeconds(file.mtimeMs);

  const cwd = lastTurnContext?.payload?.cwd || meta?.cwd || null;
  const threadId = meta?.id || meta?.session_id || null;
  const session: AgentSession = {
    sessionId: threadId,
    threadId,
    parentThreadId: meta?.parent_thread_id || null,
    threadSource: meta?.thread_source || null,
    agentNickname: meta?.agent_nickname || null,
    agentRole: meta?.agent_role || null,
    cwd,
    projectName: projectNameFromCwd(cwd),
    model: lastTurnContext?.payload?.model || null,
    effort: effortFromTurnContext(lastTurnContext?.payload),
    status: approvalPending
      ? 'waiting_approval'
      : age <= config.runningThresholdS
        ? 'running'
        : 'idle',
    contextUsedPercent: null,
    tokens: { input: null, output: null, total: null, limit: null },
    costUsd: null, // Codex records no spend locally — never fake it.
    lastEvent: describeEvent(lastLine),
    lastActivityAt: lastLine?.timestamp || new Date(file.mtimeMs).toISOString(),
    needsApproval: approvalPending,
    rateLimits: null,
  };

  if (lastTokenCount?.payload?.info) {
    const info = lastTokenCount.payload.info;
    const total = info.total_token_usage || {};
    const last = info.last_token_usage || {};
    const windowSize = info.model_context_window || null;
    session.tokens = {
      input: total.input_tokens ?? null,
      output: total.output_tokens ?? null,
      total: total.total_tokens ?? null,
      limit: windowSize,
    };
    if (last.total_tokens != null) session.contextTokens = last.total_tokens;
    if (windowSize && last.total_tokens != null) {
      session.contextUsedPercent =
        Math.min(100, Math.round((last.total_tokens / windowSize) * 1000) / 10);
    }
    const rl = lastTokenCount.payload.rate_limits;
    if (rl) {
      session.rateLimits = {
        shortWindowPercent: rl.primary?.used_percent ?? null,
        longWindowPercent: rl.secondary?.used_percent ?? null,
        resetAt: rl.primary?.resets_at
          ? new Date(rl.primary.resets_at * 1000).toISOString()
          : null,
        planType: rl.plan_type || null,
      };
    }
  }
  return session;
}

export async function collectCodex(ctx: Partial<CollectContext> = {}): Promise<AgentState> {
  const isDismissed = ctx.isDismissed || (() => false);
  const state = emptyAgentState('codex', 'Codex', '◆');

  const manual = readJsonSync(path.join(config.agentDashboardDir, 'codex-state.json'), 10 * 60 * 1000);

  const files = await listRollouts();
  const fresh = files.filter((f) => ageSeconds(f.mtimeMs) <= config.sessionRetentionS);
  const candidates = fresh.slice(0, MAX_SESSIONS);

  if (!candidates.length && !manual) {
    state.status = 'unknown';
    state.setupHint =
      `No Codex rollout logs found in ${config.codexSessionsDir}. ` +
      'Run a Codex CLI/Desktop session, or set CODEX_SESSIONS_DIR.';
    return state;
  }

  for (const f of candidates) {
    const session = await parseSession(f);
    if (session && !isDismissed(session.sessionId)) state.sessions.push(session);
  }

  aggregateFromSessions(state);
  if (state.sessions.length) {
    // Rate limits are account-level: take the most recently reported ones.
    const withLimits = state.sessions.find((s) => s.rateLimits);
    if (withLimits?.rateLimits) {
      const { planType, ...rl } = withLimits.rateLimits;
      state.rateLimits = rl;
      if (planType) state.planType = planType;
      state.sources.rateLimits = 'real';
    }
    state.sources = {
      ...state.sources,
      sessionId: 'real', cwd: 'real', model: 'real', tokens: 'real',
      contextUsedPercent: 'real', lastEvent: 'real', lastActivityAt: 'real',
      status: 'inferred',
      ...(state.effort ? { effort: 'real' as const } : {}),
    };
  }

  // Manual override file wins over everything (wrapper scripts / future hooks).
  if (manual && typeof manual === 'object') {
    for (const key of ['status', 'model', 'effort', 'cwd', 'costUsd', 'lastEvent', 'needsApproval'] as const) {
      if (manual[key] != null) {
        (state as any)[key] = manual[key];
        state.sources[key] = 'real';
      }
    }
    if (manual.cwd) state.projectName = projectNameFromCwd(manual.cwd);
  }

  return state;
}
