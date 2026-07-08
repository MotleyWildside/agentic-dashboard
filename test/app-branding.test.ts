import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('app branding uses Mimiron in package metadata', () => {
  assert.equal(packageJson.name, 'mimiron');
  assert.equal(packageJson.build.appId, 'com.wildside.mimiron');
  assert.equal(packageJson.build.productName, 'Mimiron');
});

test('browser and top bar titles use Mimiron', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const topBar = readFileSync(new URL('../src/ui/TopBar.tsx', import.meta.url), 'utf8');

  assert.match(html, /<title>Mimiron<\/title>/);
  assert.match(topBar, />Mimiron<\/Typography>/);
});

test('electron capture helper detects the Mimiron shell', () => {
  const helper = readFileSync(new URL('../scripts/capture-electron.cjs', import.meta.url), 'utf8');

  assert.match(helper, /mimiron-1024x600\.png/);
  assert.match(helper, /text\.includes\('Mimiron'\)/);
});
