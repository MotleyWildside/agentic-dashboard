import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const { readPng } = require('../scripts/round-app-icon.cjs');

test('electron-builder is wired to generated app icon assets', () => {
  assert.equal(packageJson.build.icon, 'build/icon');

  for (const ext of ['svg', 'png', 'icns', 'ico']) {
    assert.ok(statSync(new URL(`../build/icon.${ext}`, import.meta.url)).size > 0);
  }
});

test('mac electron builds ad-hoc sign the packaged app', () => {
  assert.equal(packageJson.build.afterPack, 'scripts/after-pack-mac.cjs');
  assert.ok(statSync(new URL('../scripts/after-pack-mac.cjs', import.meta.url)).size > 0);
});

test('electron app asks before configuring Claude statusline on startup', () => {
  const main = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /ensureClaudeStatusline/);
  assert.match(main, /dryRun: true/);
  assert.match(main, /showMessageBox/);
  assert.match(main, /Enable Claude limits/);
  assert.match(main, /MIMIRON_SKIP_CLAUDE_STATUSLINE_SETUP/);
});

test('generated png app icon is 1024px RGBA source art', () => {
  const png = readFileSync(new URL('../build/icon.png', import.meta.url));

  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png.readUInt8(25), 6);
});

test('generated png app icon has real transparent rounded corners', () => {
  const png = readPng(new URL('../build/icon.png', import.meta.url));
  const alphaAt = (x: number, y: number) => png.pixels[(y * png.width + x) * 4 + 3];

  assert.equal(alphaAt(0, 0), 0);
  assert.equal(alphaAt(16, 16), 0);
  assert.equal(alphaAt(png.width - 1, png.height - 1), 0);
  assert.equal(alphaAt(Math.floor(png.width / 2), Math.floor(png.height / 2)), 255);
});

test('generated native app icon containers have expected signatures', () => {
  const icns = readFileSync(new URL('../build/icon.icns', import.meta.url));
  const ico = readFileSync(new URL('../build/icon.ico', import.meta.url));

  assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 7);
});
