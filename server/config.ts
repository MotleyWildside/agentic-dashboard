import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

function expandHome(p: string): string {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

// Minimal .env loader (no dependency). Only sets vars not already in the environment.
function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env file — fine */
  }
}

loadDotEnv();

function portFromEnv(value: string | undefined): number {
  if (value === undefined || value === '') return 4321;
  const port = Number(value);
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 4321;
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: portFromEnv(process.env.PORT),
  pollMs: Math.max(1000, Number(process.env.POLL_MS) || 2000),
  claudeProjectsDir: expandHome(process.env.CLAUDE_PROJECTS_DIR || '~/.claude/projects'),
  codexSessionsDir: expandHome(process.env.CODEX_SESSIONS_DIR || '~/.codex/sessions'),
  agentDashboardDir: expandHome(process.env.AGENT_DASHBOARD_DIR || '~/.agent-dashboard'),
  runningThresholdS: Number(process.env.RUNNING_THRESHOLD_S) || 20,
  sessionRetentionS: Number(process.env.SESSION_RETENTION_S) || 15 * 60,
};

export type Config = typeof config;

// What /api/config exposes — paths only, no secrets.
export function publicConfig() {
  return {
    pollMs: config.pollMs,
    claudeProjectsDir: config.claudeProjectsDir,
    codexSessionsDir: config.codexSessionsDir,
    agentDashboardDir: config.agentDashboardDir,
    runningThresholdS: config.runningThresholdS,
    sessionRetentionS: config.sessionRetentionS,
  };
}
