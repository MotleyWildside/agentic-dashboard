import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

test('server config accepts PORT=0 for OS-assigned ports', async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '-e', "const { config } = await import('./server/config.ts'); console.log(config.port);"],
    { env: { ...process.env, PORT: '0' } }
  );

  assert.equal(stdout.trim(), '0');
});
