import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// config.js reads AGENT_DASHBOARD_DIR at import time, so point it at a temp
// dir BEFORE importing the store (node --test runs each file in its own
// process, so this cannot leak into other tests).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dashboard-test-'));
process.env.AGENT_DASHBOARD_DIR = tmpDir;

const { loadSettings, saveSettings, isEnabled, loadDismissed, saveDismissed } =
  await import('../server/lib/store.ts');

test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

test('loadSettings returns a safe default shape when no file exists', () => {
  const settings = loadSettings();
  assert.deepEqual(settings, { plugins: {}, dashboard: { widgets: [] } });
});

test('settings round-trip through save/load', () => {
  const settings = loadSettings();
  settings.dashboard.widgets = [{ widgetId: 'w1', pluginId: 'claude', x: 0, y: 0, w: 4, h: 5 }];
  saveSettings(settings);
  const reloaded = loadSettings();
  assert.deepEqual(reloaded.dashboard.widgets, settings.dashboard.widgets);
  assert.ok(fs.existsSync(path.join(tmpDir, 'settings.json')));
});

test('isEnabled derives plugin enablement from widget instances', () => {
  const settings = { plugins: {}, dashboard: { widgets: [{ widgetId: 'w1', pluginId: 'claude', x: 0, y: 0, w: 4, h: 5 }] } };
  assert.equal(isEnabled(settings, 'claude'), true);
  assert.equal(isEnabled(settings, 'codex'), false);
  assert.equal(isEnabled({ plugins: {}, dashboard: { widgets: [] } }, 'claude'), false);
});

test('saveDismissed prunes entries older than the 7-day TTL', () => {
  const fresh = new Date().toISOString();
  const stale = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const pruned = saveDismissed({ 'claude:keep': fresh, 'claude:drop': stale });
  assert.deepEqual(Object.keys(pruned), ['claude:keep']);
  assert.deepEqual(Object.keys(loadDismissed()), ['claude:keep']);
});
