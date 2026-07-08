import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('electron-builder is wired to generated app icon assets', () => {
  assert.equal(packageJson.build.icon, 'build/icon');

  for (const ext of ['svg', 'png', 'icns', 'ico']) {
    assert.ok(statSync(new URL(`../build/icon.${ext}`, import.meta.url)).size > 0);
  }
});

test('generated png app icon is 1024px RGBA source art', () => {
  const png = readFileSync(new URL('../build/icon.png', import.meta.url));

  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png.readUInt8(25), 6);
});

test('generated native app icon containers have expected signatures', () => {
  const icns = readFileSync(new URL('../build/icon.icns', import.meta.url));
  const ico = readFileSync(new URL('../build/icon.ico', import.meta.url));

  assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 7);
});
