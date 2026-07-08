#!/usr/bin/env node
/**
 * One-shot scan: run every registered agent plugin once and print the
 * normalized states. Useful for verifying what data is actually available
 * on this machine. Run with `npm run scan` (Node ≥22.18 — type stripping).
 */
import { plugins } from '../server/plugins/registry.ts';
import { collectProcesses, processMatchers } from '../server/collectors/processes.ts';
import { applyManualOverrides } from '../server/collectors/manual.ts';
import { errorAgentState } from '../server/lib/state.ts';

const ctx = { isDismissed: () => false };
const [collected, processes] = await Promise.all([
  Promise.all(
    plugins.map((p) => p.collect(ctx).catch((err) => errorAgentState(p.id, p.name, p.icon, err)))
  ),
  collectProcesses(processMatchers(plugins)),
]);
const agents = applyManualOverrides(collected);

console.log(JSON.stringify({ agents, processes }, null, 2));
