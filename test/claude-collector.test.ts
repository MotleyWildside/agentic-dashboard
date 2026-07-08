import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mimiron-claude-collector-'));
const claudeProjectsDir = path.join(tmpDir, 'claude-projects');
const agentDashboardDir = path.join(tmpDir, 'agent-dashboard');

process.env.CLAUDE_PROJECTS_DIR = claudeProjectsDir;
process.env.AGENT_DASHBOARD_DIR = agentDashboardDir;
process.env.SESSION_RETENTION_S = '900';

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

function writeTranscript(sessionId: string): void {
  const projectDir = path.join(claudeProjectsDir, 'tmp-project');
  fs.mkdirSync(projectDir, { recursive: true });
  const file = path.join(projectDir, `${sessionId}.jsonl`);
  const lines = [
    {
      type: 'user',
      sessionId,
      cwd: '/tmp/project',
      timestamp: new Date().toISOString(),
      message: { content: [{ type: 'text', text: 'hello' }] },
    },
    {
      type: 'assistant',
      sessionId,
      cwd: '/tmp/project',
      timestamp: new Date().toISOString(),
      message: {
        model: 'claude-opus-test',
        usage: { input_tokens: 10, output_tokens: 5 },
        content: [{ type: 'text', text: 'hi' }],
      },
    },
  ];
  fs.writeFileSync(file, `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`);
}

test('collectClaude uses raw statusline rate limits even when session ids differ', async () => {
  writeTranscript('transcript-session');
  fs.mkdirSync(agentDashboardDir, { recursive: true });
  fs.writeFileSync(path.join(agentDashboardDir, 'claude-statusline-latest.json'), JSON.stringify({
    session_id: 'statusline-session',
    model: { display_name: 'Opus' },
    rate_limits: {
      five_hour: { used_percentage: 37, resets_at: 1783512000 },
      seven_day: { used_percentage: 42 },
    },
  }));

  const { collectClaude } = await import('../server/collectors/claude.ts');
  const state = await collectClaude({ isDismissed: () => false });

  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].sessionId, 'transcript-session');
  assert.deepEqual(state.rateLimits, {
    shortWindowPercent: 37,
    longWindowPercent: 42,
    resetAt: '2026-07-08T12:00:00.000Z',
  });
  assert.equal(state.sources.rateLimits, 'real');
});
