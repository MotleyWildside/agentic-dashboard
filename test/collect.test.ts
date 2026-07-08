import test from 'node:test';
import assert from 'node:assert/strict';
import { collectWidgetData } from '../server/lib/collect.ts';
import type { AgentPlugin } from '../shared/types.ts';

const ctx = () => ({ isDismissed: () => false });

function plugin(over: Partial<AgentPlugin>): AgentPlugin {
  return { id: 'x', name: 'X', icon: '◇', ...over } as AgentPlugin;
}

test('collectWidgetData returns null when no plugin defines collectData', async () => {
  const agentOnly = [plugin({ id: 'a', collect: async () => ({}) as any })];
  assert.equal(await collectWidgetData(agentOnly, ctx), null);
  assert.equal(await collectWidgetData([], ctx), null);
});

test('collectWidgetData maps each collectData plugin to its payload', async () => {
  const plugins = [
    plugin({ id: 'p1', widgetType: 'w', collectData: async () => ({ v: 1 }) }),
    plugin({ id: 'p2', widgetType: 'w', collectData: async () => 'hello' }),
    plugin({ id: 'agent', collect: async () => ({}) as any }), // no collectData → excluded
  ];
  const out = await collectWidgetData(plugins, ctx);
  assert.deepEqual(out, { p1: { v: 1 }, p2: 'hello' });
});

test('collectWidgetData isolates a throwing collectData as null', async () => {
  const plugins = [
    plugin({ id: 'ok', widgetType: 'w', collectData: async () => ({ v: 2 }) }),
    plugin({ id: 'boom', widgetType: 'w', collectData: async () => { throw new Error('nope'); } }),
  ];
  const out = await collectWidgetData(plugins, ctx);
  assert.deepEqual(out, { ok: { v: 2 }, boom: null });
});

test('collectWidgetData threads the per-plugin context through', async () => {
  let seenId = '';
  const plugins = [
    plugin({
      id: 'ctxer',
      widgetType: 'w',
      collectData: async (c) => { seenId = c.isDismissed('s') ? 'dismissed' : 'kept'; return null; },
    }),
  ];
  await collectWidgetData(plugins, (id) => ({ isDismissed: () => id === 'ctxer' }));
  assert.equal(seenId, 'dismissed');
});
