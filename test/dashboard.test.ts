import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDashboard, normalizeDashboard } from '../server/lib/dashboard.ts';

const KNOWN = new Set(['claude', 'codex']);
import type { PluginMeta } from '../shared/types.ts';

const LAYOUT = { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 };
const META: PluginMeta[] = [
  { id: 'claude', name: 'Claude', icon: 'c', logo: null, layout: LAYOUT, widgetType: 'agent-card' },
  { id: 'codex', name: 'Codex', icon: 'x', logo: null, layout: LAYOUT, widgetType: 'agent-card' },
];

function widget(overrides: Record<string, any> = {}) {
  return { widgetId: 'w1', pluginId: 'claude', x: 0, y: 0, w: 4, h: 5, ...overrides };
}

test('validateDashboard accepts a well-formed payload', () => {
  assert.equal(validateDashboard({ widgets: [widget()] }, KNOWN), null);
  assert.equal(validateDashboard({ widgets: [] }, KNOWN), null);
});

test('validateDashboard rejects malformed payloads', () => {
  assert.match(validateDashboard(null, KNOWN)!, /expected/);
  assert.match(validateDashboard({ widgets: 'nope' }, KNOWN)!, /expected/);
  assert.match(validateDashboard({ widgets: [null] }, KNOWN)!, /objects/);
  assert.match(validateDashboard({ widgets: [widget({ widgetId: null })] }, KNOWN)!, /widgetId/);
  assert.match(
    validateDashboard({ widgets: [widget(), widget()] }, KNOWN)!,
    /duplicate widgetId/
  );
  assert.match(
    validateDashboard({ widgets: [widget({ pluginId: 'not-installed' })] }, KNOWN)!,
    /unknown plugin/
  );
  assert.match(validateDashboard({ widgets: [widget({ w: 'wide' })] }, KNOWN)!, /widget\.w/);
  assert.match(validateDashboard({ widgets: [widget({ x: NaN })] }, KNOWN)!, /widget\.x/);
});

test('normalizeDashboard clamps geometry to the plugin layout limits', () => {
  const { widgets } = normalizeDashboard(
    { widgets: [widget({ x: -3, y: 2.4, w: 99, h: 1 })] },
    META
  );
  assert.deepEqual(widgets[0], widget({ x: 0, y: 2, w: 8, h: 2 }));
});

test('normalizeDashboard falls back to sane limits for unknown plugin meta', () => {
  const { widgets } = normalizeDashboard({ widgets: [widget({ pluginId: 'mystery', w: 99, h: 99 })] }, META);
  assert.equal(widgets[0].w, 12);
  assert.equal(widgets[0].h, 12);
});
