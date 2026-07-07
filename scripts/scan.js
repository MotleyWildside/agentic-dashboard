#!/usr/bin/env node
/**
 * One-shot scan: run every collector once and print the normalized states.
 * Useful for verifying what data is actually available on this machine.
 */
import { collectClaude } from '../server/collectors/claude.js';
import { collectCodex } from '../server/collectors/codex.js';
import { collectProcesses } from '../server/collectors/processes.js';
import { applyManualOverrides } from '../server/collectors/manual.js';

const [claude, codex, processes] = await Promise.all([
  collectClaude(),
  collectCodex(),
  collectProcesses(),
]);
const agents = applyManualOverrides([claude, codex]);

console.log(JSON.stringify({ agents, processes }, null, 2));
