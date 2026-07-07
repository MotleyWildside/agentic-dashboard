import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Plugin registry — every *.js file in this directory (except this file and
 * files prefixed "_") is loaded as an agent plugin. Adding a new agent is
 * just dropping one file here; see _template.js for the contract.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadPlugins() {
  const entries = await fs.readdir(__dirname);
  const files = entries.filter(
    (f) => f.endsWith('.js') && f !== 'registry.js' && !f.startsWith('_')
  );

  const loaded = [];
  const seenIds = new Set();
  for (const file of files) {
    let mod;
    try {
      mod = await import(`./${file}`);
    } catch (err) {
      console.warn(`[plugins] failed to load ${file}:`, err.message);
      continue;
    }
    const plugin = mod.default;
    if (!plugin || !plugin.id || !plugin.name || typeof plugin.collect !== 'function') {
      console.warn(`[plugins] ${file} is missing a valid default export (id/name/collect) — skipped`);
      continue;
    }
    if (seenIds.has(plugin.id)) {
      console.warn(`[plugins] duplicate plugin id "${plugin.id}" in ${file} — skipped`);
      continue;
    }
    seenIds.add(plugin.id);
    loaded.push(plugin);
  }
  return loaded;
}

export const plugins = await loadPlugins();

const DEFAULT_LAYOUT = { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 };

export function pluginMeta() {
  return plugins.map(({ id, name, icon, logo, layout }) => ({
    id,
    name,
    icon,
    logo: logo || null,
    layout: { ...DEFAULT_LAYOUT, ...(layout || {}) },
  }));
}
