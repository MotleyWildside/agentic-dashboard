import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { AgentPlugin, PluginMeta } from '../../shared/types.ts';

/**
 * Plugin registry — every *.ts/*.js file in this directory (except the
 * registry itself and files prefixed "_") is loaded as an agent plugin.
 * Adding a new agent is just dropping one file here; see _template.ts for
 * the contract. Both extensions are scanned so the registry works from the
 * TypeScript sources (node type-stripping) AND from the compiled dist-server/
 * output used by the Electron shell.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPluginFile(name: string): boolean {
  if (name.startsWith('_')) return false;
  if (name.startsWith('registry.')) return false;
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.js') || name.endsWith('.ts');
}

/**
 * Load every eligible plugin file from `dir`. Exported (with an explicit dir)
 * so plugin loading — including error isolation for broken files — is testable
 * against fixture directories.
 */
export async function loadPluginsFrom(dir: string): Promise<AgentPlugin[]> {
  const entries = await fs.readdir(dir);
  const files = entries.filter(isPluginFile);

  const loaded: AgentPlugin[] = [];
  const seenIds = new Set<string>();
  for (const file of files) {
    let mod: any;
    try {
      mod = await import(pathToFileURL(path.join(dir, file)).href);
    } catch (err: any) {
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

export const plugins: AgentPlugin[] = await loadPluginsFrom(__dirname);

const DEFAULT_LAYOUT = { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 };

export function pluginMeta(): PluginMeta[] {
  return plugins.map(({ id, name, icon, logo, layout }) => ({
    id,
    name,
    icon,
    logo: logo || null,
    layout: { ...DEFAULT_LAYOUT, ...(layout || {}) },
  }));
}
