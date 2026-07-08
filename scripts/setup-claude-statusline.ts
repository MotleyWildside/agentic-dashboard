#!/usr/bin/env node
import { ensureClaudeStatusline } from '../server/lib/claudeStatusline.ts';

const result = ensureClaudeStatusline();

switch (result.status) {
  case 'installed':
  case 'updated-existing-reporter':
  case 'wrapped-existing-statusline':
    console.log(`Claude Code statusLine ${result.status}.`);
    console.log(`settings: ${result.settingsPath}`);
    console.log(`reporter: ${result.reporterPath}`);
    if (result.status === 'wrapped-existing-statusline') {
      console.log(`wrapper: ${result.wrapperPath}`);
      console.log(`previous command saved in: ${result.wrapperConfigPath}`);
    }
    break;
  case 'already-wrapped':
    console.log('Claude Code statusLine is already wrapped for Mimiron.');
    console.log(`wrapper: ${result.wrapperPath}`);
    break;
  case 'already-configured':
    console.log('Claude Code statusLine is already configured for Mimiron.');
    console.log(`reporter: ${result.reporterPath}`);
    break;
  case 'settings-invalid':
    console.error(`Could not parse ${result.settingsPath}; leaving it untouched.`);
    process.exitCode = 1;
    break;
  case 'reporter-missing':
    console.error('Could not find scripts/claude-statusline-reporter.js.');
    process.exitCode = 1;
    break;
  case 'failed':
    console.error(`Claude statusLine setup failed: ${result.error || 'unknown error'}`);
    process.exitCode = 1;
    break;
}
