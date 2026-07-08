import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function bundledAssetPath(...segments: string[]): string | null {
  for (const candidate of [
    // Source: server/lib/ -> server/plugin-assets/
    path.join(__dirname, '..', 'plugin-assets', ...segments),
    // Compiled/Electron: dist-server/server/lib/ -> server/plugin-assets/
    path.join(__dirname, '..', '..', '..', 'server', 'plugin-assets', ...segments),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function bundledAssetDataUrl(mimeType: string, ...segments: string[]): string | null {
  const file = bundledAssetPath(...segments);
  if (!file) return null;
  return `data:${mimeType};base64,${fs.readFileSync(file).toString('base64')}`;
}
