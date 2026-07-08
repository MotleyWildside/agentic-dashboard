import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureClaudeStatusline } from '../server/lib/claudeStatusline.ts';

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mimiron-claude-statusline-'));
}

function sourceReporter(root: string): string {
  const source = path.join(root, 'source-reporter.js');
  fs.writeFileSync(source, '#!/usr/bin/env node\nconsole.log("ok");\n');
  return source;
}

function sourceWrapper(root: string): string {
  const source = path.join(root, 'source-wrapper.js');
  fs.writeFileSync(source, '#!/usr/bin/env node\nconsole.log("wrapped");\n');
  return source;
}

function sources(root: string) {
  return {
    reporterSourcePath: sourceReporter(root),
    wrapperSourcePath: sourceWrapper(root),
  };
}

test('ensureClaudeStatusline creates settings when no statusLine exists', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const state = path.join(root, 'state');
  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: state,
    ...sources(root),
  });

  assert.equal(result.status, 'installed');
  assert.equal(fs.existsSync(path.join(state, 'claude-statusline-wrapper.sh')), true);
  const settings = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(settings.statusLine, { type: 'command', command: result.wrapperCommand });
});

test('ensureClaudeStatusline dryRun reports changes without writing files', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const state = path.join(root, 'state');
  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: state,
    dryRun: true,
    ...sources(root),
  });

  assert.equal(result.status, 'installed');
  assert.equal(fs.existsSync(path.join(home, '.claude', 'settings.json')), false);
  assert.equal(fs.existsSync(path.join(state, 'claude-statusline-wrapper.sh')), false);
});

test('ensureClaudeStatusline updates an older Mimiron reporter path', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const claudeDir = path.join(home, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
    statusLine: {
      type: 'command',
      command: 'node /old/path/claude-statusline-reporter.js',
    },
  }));

  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: path.join(root, 'state'),
    ...sources(root),
  });

  assert.equal(result.status, 'updated-existing-reporter');
  const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
  assert.equal(settings.statusLine.command, result.wrapperCommand);
});

test('ensureClaudeStatusline wraps a custom statusLine instead of replacing it', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const claudeDir = path.join(home, '.claude');
  const custom = { type: 'command', command: 'node /tools/my-statusline.js' };
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ statusLine: custom }));

  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: path.join(root, 'state'),
    ...sources(root),
  });

  assert.equal(result.status, 'wrapped-existing-statusline');
  const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
  assert.deepEqual(settings.statusLine, { type: 'command', command: result.wrapperCommand });
  const wrapperConfig = JSON.parse(fs.readFileSync(result.wrapperConfigPath, 'utf8'));
  assert.deepEqual(wrapperConfig, { nextCommand: custom.command });
});

test('ensureClaudeStatusline detects an already wrapped custom statusLine', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const state = path.join(root, 'state');
  const claudeDir = path.join(home, '.claude');
  const wrapperPath = path.join(state, 'claude-statusline-wrapper.sh');
  const wrapperCommand = `/bin/sh '${wrapperPath}'`;
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
    statusLine: { type: 'command', command: wrapperCommand },
  }));

  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: state,
    ...sources(root),
  });

  assert.equal(result.status, 'already-wrapped');
  const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
  assert.equal(settings.statusLine.command, wrapperCommand);
});

test('ensureClaudeStatusline does not overwrite invalid Claude settings', () => {
  const root = tmpRoot();
  const home = path.join(root, 'home');
  const claudeDir = path.join(home, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{ nope');

  const result = ensureClaudeStatusline({
    homeDir: home,
    agentDashboardDir: path.join(root, 'state'),
    ...sources(root),
  });

  assert.equal(result.status, 'settings-invalid');
  assert.equal(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'), '{ nope');
});
