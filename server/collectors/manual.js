import path from 'node:path';
import { config } from '../config.js';
import { readJsonSync } from '../lib/files.js';

/**
 * Manual collector — escape hatch for anything the automatic collectors miss.
 *
 * Drop a JSON file at ~/.agent-dashboard/manual.json shaped like:
 *   { "claude": { "status": "blocked", "lastEvent": "waiting on VPN" },
 *     "codex":  { "costUsd": 1.23 } }
 *
 * Any fields present are overlaid onto the agent's state and labelled 'manual'.
 * The file is ignored if older than 24h (stale overrides are worse than none).
 */
const OVERRIDABLE = [
  'status', 'model', 'cwd', 'projectName', 'sessionId', 'costUsd',
  'lastEvent', 'needsApproval', 'contextUsedPercent',
];

export function applyManualOverrides(agents) {
  const manual = readJsonSync(path.join(config.agentDashboardDir, 'manual.json'), 24 * 60 * 60 * 1000);
  if (!manual || typeof manual !== 'object') return agents;
  for (const agent of agents) {
    const o = manual[agent.id];
    if (!o || typeof o !== 'object') continue;
    for (const key of OVERRIDABLE) {
      if (o[key] != null) {
        agent[key] = o[key];
        agent.sources[key] = 'manual';
      }
    }
  }
  return agents;
}
