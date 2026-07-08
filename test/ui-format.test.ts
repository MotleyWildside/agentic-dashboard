import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtAgo, fmtNum, fmtPercent, shortPath } from '../src/ui/lib/format.ts';
import { statusLabel } from '../src/ui/lib/status.ts';

test('fmtNum abbreviates and handles null', () => {
  assert.equal(fmtNum(null), '—');
  assert.equal(fmtNum(undefined), '—');
  assert.equal(fmtNum(0), '0');
  assert.equal(fmtNum(999), '999');
  assert.equal(fmtNum(1500), '2k');
  assert.equal(fmtNum(2_400_000), '2.4M');
});

test('fmtPercent rounds to one decimal and handles bad input', () => {
  assert.equal(fmtPercent(null), '—');
  assert.equal(fmtPercent(NaN), '—');
  assert.equal(fmtPercent(58), '58%');
  assert.equal(fmtPercent(58.25), '58.3%');
  assert.equal(fmtPercent(58.04), '58%');
});

test('fmtAgo buckets by age relative to now', () => {
  const now = Date.parse('2026-07-08T12:00:00Z');
  assert.equal(fmtAgo(null, now), '—');
  assert.equal(fmtAgo('2026-07-08T11:59:50Z', now), '10s ago');
  assert.equal(fmtAgo('2026-07-08T11:30:00Z', now), '30m ago');
  assert.equal(fmtAgo('2026-07-08T06:00:00Z', now), '6h ago');
  assert.equal(fmtAgo('2026-07-05T12:00:00Z', now), '3d ago');
  // Future timestamps clamp to zero instead of going negative.
  assert.equal(fmtAgo('2026-07-08T13:00:00Z', now), '0s ago');
});

test('shortPath collapses the home dir and truncates long paths', () => {
  assert.equal(shortPath(null), '—');
  assert.equal(shortPath('/Users/alice/Work/proj'), '~/Work/proj');
  const long = '/Users/alice/' + Array.from({ length: 12 }, (_, i) => `dir${i}`).join('/');
  const short = shortPath(long);
  assert.ok(short.length <= 46, `expected <= 46 chars, got ${short.length}`);
  assert.ok(short.includes('…'));
});

test('statusLabel maps known statuses and falls back to uppercase', () => {
  assert.equal(statusLabel('running'), 'RUNNING');
  assert.equal(statusLabel('needs_input'), 'WAITING');
  assert.equal(statusLabel('waiting_approval'), 'ATTENTION');
  assert.equal(statusLabel('failed'), 'ERROR');
  assert.equal(statusLabel('custom'), 'CUSTOM');
  assert.equal(statusLabel(''), 'UNKNOWN');
});
