import test from 'node:test';
import assert from 'node:assert/strict';
import type { WidgetInstance } from '../shared/types.ts';
import {
  DEFAULT_WIDGET_LAYOUT,
  buildResponsiveLayouts,
  findOpenPosition,
  isValidLayoutItem,
  makeWidgetId,
  normalizeWidget,
  overlaps,
  widgetsToLayout,
} from '../src/ui/dashboard/layout.ts';

const PLUGIN = { id: 'p1', name: 'Plugin', layout: DEFAULT_WIDGET_LAYOUT };

function widget(overrides: Partial<WidgetInstance> = {}): WidgetInstance {
  return { widgetId: 'w1', pluginId: 'p1', x: 0, y: 0, w: 4, h: 5, ...overrides };
}

test('normalizeWidget clamps geometry to plugin limits', () => {
  const clamped = normalizeWidget(widget({ w: 99, h: 99, x: 50, y: -3 }), PLUGIN);
  assert.equal(clamped.w, DEFAULT_WIDGET_LAYOUT.maxW);
  assert.equal(clamped.h, DEFAULT_WIDGET_LAYOUT.maxH);
  assert.equal(clamped.x, 12 - DEFAULT_WIDGET_LAYOUT.maxW);
  assert.equal(clamped.y, 0);
});

test('normalizeWidget falls back to plugin defaults for non-finite sizes', () => {
  const fixed = normalizeWidget(widget({ w: NaN, h: Infinity, x: NaN }), PLUGIN);
  assert.equal(fixed.w, DEFAULT_WIDGET_LAYOUT.defaultW);
  assert.equal(fixed.h, DEFAULT_WIDGET_LAYOUT.defaultH);
  assert.equal(fixed.x, 0);
});

test('overlaps detects intersecting and adjacent rects', () => {
  assert.ok(overlaps({ x: 0, y: 0, w: 4, h: 4 }, { x: 2, y: 2, w: 4, h: 4 }));
  assert.ok(!overlaps({ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 0, w: 4, h: 4 }));
});

test('findOpenPosition picks the first free slot, scanning rows', () => {
  assert.deepEqual(findOpenPosition([], { w: 6, h: 5 }), { x: 0, y: 0 });
  const taken = [widget({ x: 0, y: 0, w: 6, h: 5 })];
  assert.deepEqual(findOpenPosition(taken, { w: 6, h: 5 }), { x: 6, y: 0 });
  const fullRow = [widget({ x: 0, y: 0, w: 12, h: 5 })];
  assert.deepEqual(findOpenPosition(fullRow, { w: 6, h: 5 }), { x: 0, y: 5 });
});

test('widgetsToLayout carries geometry and plugin min/max constraints', () => {
  const [item] = widgetsToLayout([widget()], new Map([[PLUGIN.id, PLUGIN]]));
  assert.equal(item.i, 'w1');
  assert.equal(item.minW, DEFAULT_WIDGET_LAYOUT.minW);
  assert.equal(item.maxH, DEFAULT_WIDGET_LAYOUT.maxH);
});

test('buildResponsiveLayouts reflows narrow breakpoints into fixed columns', () => {
  const layouts = buildResponsiveLayouts([widget(), widget({ widgetId: 'w2' })], new Map([[PLUGIN.id, PLUGIN]]));
  assert.equal(layouts.md, layouts.lg);
  assert.deepEqual(layouts.sm.map((item) => item.x), [0, 3]);
  assert.deepEqual(layouts.xs.map((item) => [item.x, item.w]), [[0, 1], [0, 1]]);
});

test('isValidLayoutItem rejects malformed grid callbacks', () => {
  assert.ok(isValidLayoutItem({ i: 'w1', x: 0, y: 0, w: 4, h: 5 }));
  assert.ok(!isValidLayoutItem(null));
  assert.ok(!isValidLayoutItem({ i: 'w1', x: NaN, y: 0, w: 4, h: 5 }));
  assert.ok(!isValidLayoutItem({ i: 42 as unknown as string, x: 0, y: 0, w: 4, h: 5 }));
});

test('makeWidgetId is prefixed with the plugin id and unique', () => {
  const a = makeWidgetId('p1');
  const b = makeWidgetId('p1');
  assert.ok(a.startsWith('p1-'));
  assert.notEqual(a, b);
});
