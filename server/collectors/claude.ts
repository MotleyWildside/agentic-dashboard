import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { tailJsonl, readJsonSync, ageSeconds, type JsonlLine } from '../lib/files.ts';
import { aggregateFromSessions, emptyAgentState, projectNameFromCwd } from '../lib/state.ts';
import type { AgentSession, AgentState, CollectContext, PendingInput } from '../../shared/types.ts';

/**
 * Claude Code collector — multi-session.
 *
 * Every Claude Code session is one JSONL transcript under
 * ~/.claude/projects/<sanitized-cwd>/<sessionId>.jsonl. All transcripts touched
 * within SESSION_RETENTION_S are treated as dashboard sessions and parsed
 * individually; the agent-level status is the most urgent session status.
 *
 * The statusline reporter state file (~/.agent-dashboard/claude-state.json)
 * overlays REAL cost/model/context onto matching sessions when configured.
 */

// Claude Code does not write its context-window size to the transcript.
// 200k is the standard window for current Claude models — labelled 'inferred'.
const ASSUMED_CONTEXT_WINDOW = 200_000;
const MAX_SESSIONS = 20;

interface TranscriptFile {
  path: string;
  mtimeMs: number;
  threadSource: 'user' | 'subagent';
  parentThreadId?: string;
  agentId?: string;
}

function describeLine(line: JsonlLine): string | null {
  const msg = line.message;
  if (line.type === 'assistant' && msg && Array.isArray(msg.content)) {
    const tool = msg.content.find((c: any) => c.type === 'tool_use');
    if (tool) return `tool: ${tool.name}`;
    if (msg.content.some((c: any) => c.type === 'text')) return 'assistant replied';
    return 'assistant message';
  }
  if (line.type === 'user' && msg && Array.isArray(msg.content)) {
    if (msg.content.some((c: any) => c.type === 'tool_result')) return 'tool result received';
    return 'user message';
  }
  if (line.type === 'user') return 'user message';
  if (line.type === 'summary') return 'session summarized';
  if (line.type === 'system') return line.subtype ? `system: ${line.subtype}` : 'system event';
  return line.type || null;
}

async function listTranscripts(): Promise<TranscriptFile[]> {
  const files: TranscriptFile[] = [];
  let dirs: string[] = [];
  try {
    dirs = await fs.readdir(config.claudeProjectsDir);
  } catch {
    return files;
  }
  for (const d of dirs) {
    const dir = path.join(config.claudeProjectsDir, d);
    let entries: import('node:fs').Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const name = entry.name;
      if (!name.endsWith('.jsonl')) continue;
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.isFile()) files.push({ path: full, mtimeMs: stat.mtimeMs, threadSource: 'user' });
      } catch { /* raced away */ }
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subagentsDir = path.join(dir, entry.name, 'subagents');
      let subagentEntries: string[] = [];
      try {
        subagentEntries = await fs.readdir(subagentsDir);
      } catch {
        continue;
      }
      for (const name of subagentEntries) {
        if (!name.endsWith('.jsonl')) continue;
        const full = path.join(subagentsDir, name);
        try {
          const stat = await fs.stat(full);
          if (stat.isFile()) {
            files.push({
              path: full,
              mtimeMs: stat.mtimeMs,
              threadSource: 'subagent',
              parentThreadId: entry.name,
              agentId: name.replace(/\.jsonl$/, '').replace(/^agent-/, ''),
            });
          }
        } catch { /* raced away */ }
      }
    }
  }
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files;
}

// Tool calls whose result the user, not the dashboard, must provide.
const PENDING_INPUT_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);
const MAX_QUESTION_LEN = 200;

function truncate(s: unknown, max: number): any {
  if (typeof s !== 'string') return s;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function effortFromReporter(reporterSession: any = {}): string | null {
  return reporterSession.effort?.level || reporterSession.effortLevel || null;
}

function reporterSessionFromStatuslinePayload(input: any = {}): any | null {
  if (!input || typeof input !== 'object') return null;
  const sessionId = input.session_id || 'unknown';
  const model = input.model?.display_name || input.model?.id || null;
  const effort = input.effort?.level ? { level: input.effort.level } : null;
  const cwd = input.workspace?.current_dir || input.cwd || null;
  const costUsd = typeof input.cost?.total_cost_usd === 'number' ? input.cost.total_cost_usd : null;

  const cw = input.context_window || {};
  const contextUsedPercent = typeof cw.used_percentage === 'number' ? cw.used_percentage : null;
  const contextWindowSize = typeof cw.context_window_size === 'number' ? cw.context_window_size : null;
  const contextTokens =
    typeof cw.total_input_tokens === 'number'
      ? cw.total_input_tokens + (cw.total_output_tokens || 0)
      : null;

  const rl = input.rate_limits || {};
  const rateLimits =
    rl.five_hour || rl.seven_day
      ? {
          shortWindowPercent: rl.five_hour?.used_percentage ?? null,
          longWindowPercent: rl.seven_day?.used_percentage ?? null,
          resetAt: rl.five_hour?.resets_at
            ? new Date(rl.five_hour.resets_at * 1000).toISOString()
            : null,
        }
      : null;

  return {
    sessionId,
    model,
    effort,
    cwd,
    costUsd,
    contextUsedPercent,
    contextWindowSize,
    contextTokens,
    rateLimits,
    version: input.version || null,
    updatedAt: new Date().toISOString(),
  };
}

function reporterWithRawStatusline(reporter: any, rawPayload: any): any {
  const rawSession = reporterSessionFromStatuslinePayload(rawPayload);
  if (!rawSession) return reporter;
  const next = reporter && typeof reporter === 'object'
    ? { ...reporter, sessions: { ...(reporter.sessions || {}) } }
    : { sessions: {}, latest: null };
  next.sessions[rawSession.sessionId] = rawSession;
  next.latest = rawSession.sessionId;
  return next;
}

function freshestReporterLimits(reporter: any): any | null {
  let freshest: any = null;
  for (const r of Object.values<any>(reporter?.sessions || {})) {
    if (r?.rateLimits && (!freshest || r.updatedAt > freshest.updatedAt)) {
      freshest = { ...r.rateLimits, updatedAt: r.updatedAt };
    }
  }
  return freshest;
}

/**
 * If the last consequential line is an assistant tool_use awaiting a user
 * decision (AskUserQuestion / ExitPlanMode) with no matching tool_result yet,
 * the session is blocked on input only the user can give — not detectable
 * as "running" by write recency, since nothing further gets written until
 * they answer in their terminal.
 */
function detectPendingInput(lines: JsonlLine[]): PendingInput | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (l.type === 'user') return null; // a reply landed after the last tool_use — resolved
    if (l.type !== 'assistant' || !Array.isArray(l.message?.content)) continue;
    const tool = l.message.content.find(
      (c: any) => c.type === 'tool_use' && PENDING_INPUT_TOOLS.has(c.name)
    );
    if (!tool) continue;
    if (tool.name === 'AskUserQuestion') {
      const questions = (tool.input?.questions || []).map((q: any) => ({
        question: truncate(q.question, MAX_QUESTION_LEN),
        header: q.header || null,
        options: (q.options || []).map((o: any) => truncate(o.label, 60)),
      }));
      return { tool: tool.name, questions };
    }
    return { tool: tool.name, questions: [] }; // ExitPlanMode — plan awaiting approval
  }
  return null;
}

async function parseSession(file: TranscriptFile): Promise<AgentSession | null> {
  let lines: JsonlLine[];
  try {
    lines = await tailJsonl(file.path);
  } catch {
    return null;
  }
  if (!lines.length) return null;

  let lastAssistant: JsonlLine | null = null;
  let lastMeta: JsonlLine | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (l.sessionId && (l.cwd || !lastMeta)) lastMeta = l;
    if (!lastAssistant && l.type === 'assistant' && l.message?.usage) lastAssistant = l;
    if (lastMeta && lastAssistant) break;
  }
  if (!lastMeta) return null;
  const lastLine = lines[lines.length - 1];
  const age = ageSeconds(file.mtimeMs);
  const pendingInput = detectPendingInput(lines);

  const isSubagent = file.threadSource === 'subagent' || lastMeta.isSidechain;
  const parentThreadId = isSubagent ? (file.parentThreadId || lastMeta.sessionId) : null;
  const agentId = file.agentId || lastMeta.agentId || null;
  const threadId = isSubagent && agentId ? `${parentThreadId}:agent:${agentId}` : lastMeta.sessionId;

  const session: AgentSession = {
    sessionId: threadId,
    threadId,
    parentThreadId,
    threadSource: isSubagent ? 'subagent' : 'user',
    agentNickname: isSubagent && agentId ? `agent-${agentId.slice(0, 6)}` : null,
    agentRole: isSubagent ? 'subagent' : null,
    cwd: lastMeta.cwd || null,
    projectName: projectNameFromCwd(lastMeta.cwd),
    model: lastAssistant?.message?.model || null,
    status: pendingInput ? 'needs_input' : age <= config.runningThresholdS ? 'running' : 'idle',
    contextUsedPercent: null,
    tokens: { input: null, output: null, total: null, limit: null },
    costUsd: null,
    lastEvent: lastLine ? describeLine(lastLine) : null,
    lastActivityAt: lastLine?.timestamp || new Date(file.mtimeMs).toISOString(),
    needsApproval: false,
    pendingInput,
  };

  if (lastAssistant) {
    const u = lastAssistant.message.usage;
    const input =
      (u.input_tokens || 0) +
      (u.cache_read_input_tokens || 0) +
      (u.cache_creation_input_tokens || 0);
    const output = u.output_tokens || 0;
    session.tokens = { input, output, total: input + output, limit: ASSUMED_CONTEXT_WINDOW };
    session.contextTokens = input + output;
    session.contextUsedPercent = Math.min(
      100,
      Math.round(((input + output) / ASSUMED_CONTEXT_WINDOW) * 1000) / 10
    );
  }
  return session;
}

export async function collectClaude(ctx: Partial<CollectContext> = {}): Promise<AgentState> {
  const isDismissed = ctx.isDismissed || (() => false);
  const state = emptyAgentState('claude', 'Claude Code', '✳');

  const statePath = path.join(config.agentDashboardDir, 'claude-state.json');
  const rawStatuslinePath = path.join(config.agentDashboardDir, 'claude-statusline-latest.json');
  const reporter = reporterWithRawStatusline(
    readJsonSync(statePath, 2 * 60 * 1000), // trust for 2 minutes
    readJsonSync(rawStatuslinePath, 2 * 60 * 1000)
  );

  const files = await listTranscripts();
  const fresh = files.filter((f) => ageSeconds(f.mtimeMs) <= config.sessionRetentionS);
  const candidates = fresh.slice(0, MAX_SESSIONS);

  if (!candidates.length && !reporter) {
    state.status = 'unknown';
    state.setupHint =
      `No Claude Code transcripts found in ${config.claudeProjectsDir}. ` +
      'Run a Claude Code session, or set CLAUDE_PROJECTS_DIR.';
    return state;
  }

  for (const f of candidates) {
    const session = await parseSession(f);
    if (session && !isDismissed(session.sessionId)) state.sessions.push(session);
  }

  // Statusline reporter overlays real cost/model/context/rate-limits per session.
  let freshestLimits: any = freshestReporterLimits(reporter);
  if (reporter?.sessions) {
    for (const session of state.sessions) {
      const r = session.sessionId ? reporter.sessions[session.sessionId] : null;
      if (!r) continue;
      if (r.model) session.model = r.model;
      session.effort = effortFromReporter(r);
      if (typeof r.costUsd === 'number') session.costUsd = r.costUsd;
      if (typeof r.contextUsedPercent === 'number') session.contextUsedPercent = r.contextUsedPercent;
      if (typeof r.contextWindowSize === 'number') session.tokens.limit = r.contextWindowSize;
      if (typeof r.contextTokens === 'number') {
        session.contextTokens = r.contextTokens;
        session.tokens.total = r.contextTokens;
      }
    }
  }

  // Agent-level aggregate = the newest session, status = most urgent.
  aggregateFromSessions(state);
  if (state.sessions.length) {
    state.costUsd = state.sessions.reduce<number | null>(
      (sum, s) => (s.costUsd != null ? (sum ?? 0) + s.costUsd : sum),
      null
    );
    if (freshestLimits) {
      const { updatedAt, ...rl } = freshestLimits;
      state.rateLimits = rl;
    }
    state.sources = {
      sessionId: 'real', cwd: 'real', model: 'real', tokens: 'real',
      'tokens.limit': 'inferred', contextUsedPercent: reporter ? 'real' : 'inferred',
      lastEvent: 'real', lastActivityAt: 'real', status: 'inferred',
      ...(state.effort ? { effort: 'real' as const } : {}),
      ...(state.costUsd != null ? { costUsd: 'real' as const } : {}),
      ...(freshestLimits ? { rateLimits: 'real' as const } : {}),
    };
  }

  if (!state.sessions.length && freshestLimits) {
    const { updatedAt, ...rl } = freshestLimits;
    state.rateLimits = rl;
    state.sources.rateLimits = 'real';
  }

  if (!reporter) {
    state.setupHint =
      'For live cost & model data, configure the statusline reporter (see README).';
  }

  return state;
}
