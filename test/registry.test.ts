import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPluginsFrom, plugins, pluginMeta } from '../server/plugins/registry.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'plugins');

test('loadPluginsFrom isolates broken plugins and enforces the contract', async () => {
  const loaded = await loadPluginsFrom(FIXTURES);
  // Two survive: good.js (collect) and data-only.js (collectData only, ADR-0006).
  // duplicate.js shares good's id, invalid-shape.js has neither collect nor
  // collectData, throws-on-load.js fails to import, _skipped.js is underscored.
  const ids = loaded.map((p) => p.id).sort();
  assert.deepEqual(ids, ['data-only', 'good']);
  const good = loaded.find((p) => p.id === 'good')!;
  assert.equal(typeof good.collect, 'function');
});

test('a collectData-only plugin loads without a collect() (custom widgets)', async () => {
  const loaded = await loadPluginsFrom(FIXTURES);
  const dataOnly = loaded.find((p) => p.id === 'data-only')!;
  assert.equal(dataOnly.collect, undefined);
  assert.equal(typeof dataOnly.collectData, 'function');
  assert.equal(dataOnly.widgetType, 'custom');
});

test('the real plugin directory loads claude, codex, and the pulse example', () => {
  const ids = plugins.map((p) => p.id).sort();
  assert.deepEqual(ids, ['claude', 'codex', 'pulse']);
  for (const p of plugins) {
    // Every plugin provides at least one data path.
    assert.ok(typeof p.collect === 'function' || typeof p.collectData === 'function', `${p.id} data path`);
  }
});

test('pluginMeta exposes layout defaults, widgetType, and no collector internals', () => {
  const byId = Object.fromEntries(pluginMeta().map((m) => [m.id, m]));
  for (const meta of pluginMeta()) {
    assert.ok(meta.id && meta.name);
    for (const key of ['minW', 'minH', 'defaultW', 'defaultH', 'maxW', 'maxH'] as const) {
      assert.equal(typeof meta.layout[key], 'number', `${meta.id}.layout.${key}`);
    }
    assert.equal(typeof meta.widgetType, 'string', `${meta.id}.widgetType`);
    assert.equal((meta as any).collect, undefined);
    assert.equal((meta as any).collectData, undefined);
    assert.equal((meta as any).matchProcess, undefined);
  }
  // Agent plugins default to the standard card; the pulse example opts into its own renderer.
  assert.equal(byId.claude.widgetType, 'agent-card');
  assert.equal(byId.pulse.widgetType, 'pulse');
});

test('process matchers match their own CLIs and not each other', () => {
  const byId = Object.fromEntries(plugins.map((p) => [p.id, p.matchProcess!]));
  assert.equal(byId.claude('/usr/local/bin/claude --resume'), true);
  assert.equal(byId.claude('node /x/claude-code/dist/cli.js'), true);
  assert.equal(byId.claude('/usr/local/bin/codex exec'), false);
  assert.equal(byId.codex('/usr/local/bin/codex exec'), true);
  assert.equal(byId.codex('Codex Updater.app helper'), false);
  assert.equal(byId.codex('/usr/local/bin/claude'), false);
});
