import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { readJsonSync } from './files.js';

/**
 * Small JSON stores under ~/.agent-dashboard/ for user-editable dashboard
 * state (as opposed to collector state). Writes are atomic (tmp + rename).
 */

const SETTINGS_PATH = path.join(config.agentDashboardDir, 'settings.json');
const DISMISSED_PATH = path.join(config.agentDashboardDir, 'dismissed.json');
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export function loadSettings() {
  const settings = readJsonSync(SETTINGS_PATH) || {};
  return {
    plugins: settings.plugins || {},
    dashboard: {
      widgets: Array.isArray(settings.dashboard?.widgets) ? settings.dashboard.widgets : [],
    },
  };
}

export function saveSettings(settings) {
  writeJsonAtomic(SETTINGS_PATH, settings);
}

export function isEnabled(settings, pluginId) {
  return Boolean(settings.dashboard?.widgets?.some((widget) => widget.pluginId === pluginId));
}

/** dismissed.json: { "<agentId>:<sessionId>": "<ISO date dismissed at>" } */
export function loadDismissed() {
  return readJsonSync(DISMISSED_PATH) || {};
}

export function saveDismissed(map) {
  const now = Date.now();
  const pruned = {};
  for (const [key, at] of Object.entries(map)) {
    if (now - new Date(at).getTime() <= DISMISSED_TTL_MS) pruned[key] = at;
  }
  writeJsonAtomic(DISMISSED_PATH, pruned);
  return pruned;
}
