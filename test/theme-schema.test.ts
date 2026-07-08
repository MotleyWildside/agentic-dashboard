import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateThemePack, isHex, DEFAULT_THEME_ID } from '../shared/theme-schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = path.join(__dirname, '..', 'themes');

test('isHex accepts 3/6/8-digit hex colors only', () => {
  assert.equal(isHex('#fff'), true);
  assert.equal(isHex('#0D141D'), true);
  assert.equal(isHex('#0D141DFF'), true);
  assert.equal(isHex('red'), false);
  assert.equal(isHex('#0D141'), false);
  assert.equal(isHex(null), false);
});

test('every bundled theme passes validation', () => {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'expected bundled themes');
  for (const file of files) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'));
    assert.deepEqual(validateThemePack(theme), [], `${file} should be valid`);
  }
});

test('the default theme id exists as a bundled theme', () => {
  assert.ok(fs.existsSync(path.join(THEMES_DIR, `${DEFAULT_THEME_ID}.json`)));
});

test('invalid theme packs are rejected with readable errors', () => {
  assert.ok(validateThemePack(null).length > 0);
  assert.ok(validateThemePack({}).length > 0);

  const errors = validateThemePack({
    id: 'Bad ID!', // invalid characters
    name: 'Broken',
    mode: 'sepia', // invalid mode
    palette: { background: { default: 'blue', paper: '#111' }, text: { primary: '#eee' }, accent: '#4ADE80' },
    status: { running: '#4ADE80', idle: '#9CA3AF', waiting: '#FBBF24', attention: '#FBBF24', error: 'crimson' },
  });
  assert.ok(errors.some((e) => e.includes('id')));
  assert.ok(errors.some((e) => e.includes('mode')));
  assert.ok(errors.some((e) => e.includes('background.default')));
  assert.ok(errors.some((e) => e.includes('status.error')));
});
