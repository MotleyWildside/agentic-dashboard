import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.ts';
import { readJsonSync } from './files.ts';
import type { Settings } from '../../shared/types.ts';

/**
 * Small JSON stores under ~/.agent-dashboard/ for user-editable dashboard
 * state (as opposed to collector state). Writes are atomic (tmp + rename).
 */

const SETTINGS_PATH = path.join(config.agentDashboardDir, 'settings.json');
const DISMISSED_PATH = path.join(config.agentDashboardDir, 'dismissed.json');
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function writeJsonAtomic(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export function loadSettings(): Settings {
  const settings = readJsonSync(SETTINGS_PATH) || {};
  return {
    plugins: settings.plugins || {},
    dashboard: {
      widgets: Array.isArray(settings.dashboard?.widgets) ? settings.dashboard.widgets : [],
    },
  };
}

export function saveSettings(settings: Settings): void {
  writeJsonAtomic(SETTINGS_PATH, settings);
}

/** A plugin is "enabled" iff at least one dashboard widget instance uses it. */
export function isEnabled(settings: Settings, pluginId: string): boolean {
  return Boolean(settings.dashboard?.widgets?.some((widget) => widget.pluginId === pluginId));
}

export type DismissedMap = Record<string, string>;

/** dismissed.json: { "<agentId>:<sessionId>": "<ISO date dismissed at>" } */
export function loadDismissed(): DismissedMap {
  return readJsonSync(DISMISSED_PATH) || {};
}

export function saveDismissed(map: DismissedMap): DismissedMap {
  const now = Date.now();
  const pruned: DismissedMap = {};
  for (const [key, at] of Object.entries(map)) {
    if (now - new Date(at).getTime() <= DISMISSED_TTL_MS) pruned[key] = at;
  }
  writeJsonAtomic(DISMISSED_PATH, pruned);
  return pruned;
}
