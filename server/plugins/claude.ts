import { collectClaude } from '../collectors/claude.ts';
import type { AgentPlugin } from '../../shared/types.ts';

const plugin: AgentPlugin = {
  id: 'claude',
  name: 'Claude Code',
  icon: '✳',
  logo: '/plugin-assets/logos/claude.webp',
  collect: collectClaude,
  // Claude Code CLI binary (native binary or npm dist), not this dashboard.
  matchProcess: (cmd) => /(^|\/)claude( |$)/.test(cmd) || /claude-code.*\/cli\.js/.test(cmd),
};

export default plugin;
