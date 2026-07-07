#!/usr/bin/env node
// Launches the Electron shell. Run via `node electron/launch.cjs` (see the
// "app" npm script) rather than `electron .` directly, because some parent
// environments export ELECTRON_RUN_AS_NODE=1 — which makes the Electron binary
// boot as a plain Node process (no `app`/`BrowserWindow`), crashing on startup.
// Stripping it here guarantees a real GUI launch regardless of the caller.
const { spawn } = require('node:child_process');
const path = require('node:path');
const electronBinary = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [path.join(__dirname, '..')], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
