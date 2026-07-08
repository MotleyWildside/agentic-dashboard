import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPluginsFrom, plugins, pluginMeta } from '../server/plugins/registry.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'plugins');

test('loadPluginsFrom isolates broken plugins and enforces the contract', async () => {
  const loaded = await loadPluginsFrom(FIXTURES);
  // Only one plugin survives: good.js. duplicate.js shares its id,
  // invalid-shape.js has no collect(), throws-on-load.js fails to import,
  // _skipped.js is underscore-prefixed.
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'good');
  assert.equal(typeof loaded[0].collect, 'function');
});

test('the real plugin directory loads claude and codex', () => {
  const ids = plugins.map((p) => p.id).sort();
  assert.deepEqual(ids, ['claude', 'codex']);
  for (const p of plugins) {
    assert.equal(typeof p.collect, 'function', `${p.id}.collect`);
    assert.equal(typeof p.matchProcess, 'function', `${p.id}.matchProcess`);
  }
});

test('pluginMeta exposes layout defaults and no collector internals', () => {
  for (const meta of pluginMeta()) {
    assert.ok(meta.id && meta.name);
    for (const key of ['minW', 'minH', 'defaultW', 'defaultH', 'maxW', 'maxH'] as const) {
      assert.equal(typeof meta.layout[key], 'number', `${meta.id}.layout.${key}`);
    }
    assert.equal((meta as any).collect, undefined);
    assert.equal((meta as any).matchProcess, undefined);
  }
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
