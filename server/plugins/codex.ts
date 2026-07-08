import { collectCodex } from '../collectors/codex.ts';
import type { AgentPlugin } from '../../shared/types.ts';

const plugin: AgentPlugin = {
  id: 'codex',
  name: 'Codex',
  icon: '◆',
  logo: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5"
      stroke="#e8e8e3" stroke-width="1.7" stroke-linejoin="round"/>
    <polygon points="16.5,12 14.25,15.9 9.75,15.9 7.5,12 9.75,8.1 14.25,8.1"
      stroke="#e8e8e3" stroke-width="1.4" stroke-linejoin="round" opacity="0.75"
      transform="rotate(30 12 12)"/>
  </svg>`,
  collect: collectCodex,
  // Codex CLI / Desktop app-server. Exclude updater/helper noise.
  matchProcess: (cmd) =>
    (/(^|\/)codex( |$)/.test(cmd) || /codex app-server/.test(cmd)) && !/Sparkle|Updater/.test(cmd),
};

export default plugin;
