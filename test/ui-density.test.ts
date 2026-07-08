import test from 'node:test';
import assert from 'node:assert/strict';
import { cardDensity } from '../src/ui/lib/density.ts';

test('large cards show every session row', () => {
  const density = cardDensity({ w: 6, h: 5 }, 7);
  assert.equal(density.small, false);
  assert.equal(density.medium, false);
  assert.equal(density.visibleSessionCount, 7);
});

test('mid-height cards are medium but uncapped', () => {
  const density = cardDensity({ w: 6, h: 4 }, 3);
  assert.equal(density.small, false);
  assert.equal(density.medium, true);
  assert.equal(density.visibleSessionCount, 3);
});

test('narrow width triggers small even when tall', () => {
  const density = cardDensity({ w: 3, h: 8 }, 5);
  assert.equal(density.small, true);
  assert.equal(density.medium, false);
});

test('tall small cards fit multiple dense rows', () => {
  const density = cardDensity({ w: 3, h: 8 }, 5);
  assert.ok(density.visibleSessionCount >= 3, `expected >=3 rows, got ${density.visibleSessionCount}`);
});

test('small-card row count never exceeds the sessions available', () => {
  const density = cardDensity({ w: 3, h: 12 }, 2);
  assert.equal(density.visibleSessionCount, 2);
});

test('tiny cards still show zero session rows', () => {
  const density = cardDensity({ w: 3, h: 2 }, 5);
  assert.equal(density.small, true);
  assert.equal(density.visibleSessionCount, 0);
});

test('short-but-wide cards are small and fit nothing extra', () => {
  const density = cardDensity({ w: 8, h: 2 }, 4);
  assert.equal(density.small, true);
  assert.equal(density.visibleSessionCount, 0);
});
