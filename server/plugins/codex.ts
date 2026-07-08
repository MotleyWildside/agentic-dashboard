import { collectCodex } from '../collectors/codex.ts';
import { bundledAssetDataUrl } from '../lib/assets.ts';
import type { AgentPlugin } from '../../shared/types.ts';

const plugin: AgentPlugin = {
  id: 'codex',
  name: 'Codex',
  icon: '◆',
  logo: bundledAssetDataUrl('image/png', 'logos', 'codex.png') || '/plugin-assets/logos/codex.png',
  collect: collectCodex,
  // Codex CLI / Desktop app-server. Exclude updater/helper noise.
  matchProcess: (cmd) =>
    (/(^|\/)codex( |$)/.test(cmd) || /codex app-server/.test(cmd)) && !/Sparkle|Updater/.test(cmd),
};

export default plugin;
