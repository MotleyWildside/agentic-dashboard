import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WIDGET_TYPE,
  UNKNOWN_WIDGET_TYPE,
  resolveWidgetType,
} from '../src/ui/widgets/resolve.ts';

const REGISTERED = [DEFAULT_WIDGET_TYPE, 'pulse', UNKNOWN_WIDGET_TYPE];

test('undefined/empty widgetType resolves to the default agent card', () => {
  assert.equal(resolveWidgetType(undefined, REGISTERED), DEFAULT_WIDGET_TYPE);
  assert.equal(resolveWidgetType(null, REGISTERED), DEFAULT_WIDGET_TYPE);
  assert.equal(resolveWidgetType('', REGISTERED), DEFAULT_WIDGET_TYPE);
});

test('a registered widgetType resolves to itself', () => {
  assert.equal(resolveWidgetType('pulse', REGISTERED), 'pulse');
  assert.equal(resolveWidgetType(DEFAULT_WIDGET_TYPE, REGISTERED), DEFAULT_WIDGET_TYPE);
});

test('an unregistered widgetType falls back to unknown (honest, never blank)', () => {
  assert.equal(resolveWidgetType('does-not-exist', REGISTERED), UNKNOWN_WIDGET_TYPE);
});

test('the resolved key is always present in the registry', () => {
  const set = new Set(REGISTERED);
  for (const input of [undefined, 'pulse', 'agent-card', 'ghost', '']) {
    assert.ok(set.has(resolveWidgetType(input, REGISTERED)));
  }
});
