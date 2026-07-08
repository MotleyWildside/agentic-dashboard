import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The guardrail linters (scripts/lint-docs.ts, scripts/lint-arch.ts) are part
 * of the development protocol — this protects that they stay runnable and
 * that the repo itself stays clean under them. If one of these fails, either
 * fix the violation it reports, or (deliberately) change the rule in the
 * linter + module map + an ADR.
 */
test('docs linter passes on the repository', async () => {
  const { stdout } = await execFileP(process.execPath, ['scripts/lint-docs.ts'], { cwd: ROOT });
  assert.match(stdout, /✔ docs lint/);
});

test('architecture linter passes on the repository', async () => {
  const { stdout } = await execFileP(process.execPath, ['scripts/lint-arch.ts'], { cwd: ROOT });
  assert.match(stdout, /✔ arch lint/);
});
