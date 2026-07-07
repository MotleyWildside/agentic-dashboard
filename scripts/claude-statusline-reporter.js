#!/usr/bin/env node
/**
 * Claude Code statusline reporter.
 *
 * Claude Code invokes the configured statusline command with a JSON payload on
 * stdin (session_id, model, workspace, cost, …) every time the statusline
 * refreshes. This script:
 *   1. writes the latest state per session to ~/.agent-dashboard/claude-state.json
 *      (which the dashboard backend reads), and
 *   2. prints a normal statusline string to stdout, so it works as your
 *      day-to-day statusline too.
 *
 * Install: add to ~/.claude/settings.json:
 *   "statusLine": {
 *     "type": "command",
 *     "command": "node /ABSOLUTE/PATH/TO/scripts/claude-statusline-reporter.js"
 *   }
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STATE_DIR = process.env.AGENT_DASHBOARD_DIR
  ? process.env.AGENT_DASHBOARD_DIR.replace(/^~(?=\/|$)/, os.homedir())
  : path.join(os.homedir(), '.agent-dashboard');
const STATE_FILE = path.join(STATE_DIR, 'claude-state.json');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write('claude');
    return;
  }

  const sessionId = input.session_id || 'unknown';
  const model = input.model?.display_name || input.model?.id || null;
  const effort = input.effort?.level ? { level: input.effort.level } : null;
  const cwd = input.workspace?.current_dir || input.cwd || null;
  const costUsd = typeof input.cost?.total_cost_usd === 'number' ? input.cost.total_cost_usd : null;

  // context_window: live context usage from the most recent API response.
  const cw = input.context_window || {};
  const contextUsedPercent = typeof cw.used_percentage === 'number' ? cw.used_percentage : null;
  const contextWindowSize = typeof cw.context_window_size === 'number' ? cw.context_window_size : null;
  const contextTokens =
    typeof cw.total_input_tokens === 'number'
      ? cw.total_input_tokens + (cw.total_output_tokens || 0)
      : null;

  // rate_limits: present for Claude.ai Pro/Max subscribers after the first API response.
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

  let state = { sessions: {}, latest: null };
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!state.sessions) state = { sessions: {}, latest: null };
  } catch { /* first run */ }

  state.sessions[sessionId] = {
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
  state.latest = sessionId;

  // Prune sessions not updated in 24h.
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, s] of Object.entries(state.sessions)) {
    if (new Date(s.updatedAt).getTime() < cutoff) delete state.sessions[id];
  }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* never break the statusline over a write error */ }

  // Statusline text shown in Claude Code.
  const parts = [];
  if (model) parts.push(model);
  if (cwd) parts.push(path.basename(cwd));
  if (costUsd != null) parts.push(`$${costUsd.toFixed(2)}`);
  process.stdout.write(parts.join(' | ') || 'claude');
});
