import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tailJsonl, headJsonl, readJsonSync } from '../server/lib/files.ts';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dashboard-files-'));
test.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

function write(name: string, content: string) {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, content);
  return file;
}

test('tailJsonl parses trailing lines and skips corrupt ones', async () => {
  const file = write('a.jsonl', '{"n":1}\nnot json\n{"n":2}\n');
  const lines = await tailJsonl(file);
  assert.deepEqual(lines, [{ n: 1 }, { n: 2 }]);
});

test('tailJsonl drops the partial first line when reading a byte window', async () => {
  const rows = Array.from({ length: 50 }, (_, i) => JSON.stringify({ i, pad: 'x'.repeat(40) }));
  const file = write('b.jsonl', rows.join('\n') + '\n');
  const lines = await tailJsonl(file, 512); // smaller than the file → cuts mid-line
  assert.ok(lines.length > 0 && lines.length < 50);
  assert.equal(lines[lines.length - 1].i, 49);
  for (const line of lines) assert.equal(typeof line.i, 'number');
});

test('headJsonl returns the first line only', async () => {
  const file = write('c.jsonl', '{"first":true}\n{"first":false}\n');
  assert.deepEqual(await headJsonl(file), { first: true });
});

test('readJsonSync returns null for missing, corrupt, or stale files', () => {
  assert.equal(readJsonSync(path.join(tmpDir, 'missing.json')), null);
  const corrupt = write('corrupt.json', '{oops');
  assert.equal(readJsonSync(corrupt), null);
  const ok = write('ok.json', '{"a":1}');
  assert.deepEqual(readJsonSync(ok), { a: 1 });
  assert.deepEqual(readJsonSync(ok, 60_000), { a: 1 });
  fs.utimesSync(ok, new Date(Date.now() - 120_000), new Date(Date.now() - 120_000));
  assert.equal(readJsonSync(ok, 60_000), null); // stale
});
