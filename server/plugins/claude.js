import { collectClaude } from '../collectors/claude.js';

export default {
  id: 'claude',
  name: 'Claude Code',
  icon: '✳',
  logo: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <g stroke="#d97757" stroke-width="2" stroke-linecap="round">
      <line x1="12" y1="12" x2="12" y2="3.2"/><line x1="12" y1="12" x2="18.2" y2="5.8"/>
      <line x1="12" y1="12" x2="20.8" y2="12"/><line x1="12" y1="12" x2="18.2" y2="18.2"/>
      <line x1="12" y1="12" x2="12" y2="20.8"/><line x1="12" y1="12" x2="5.8" y2="18.2"/>
      <line x1="12" y1="12" x2="3.2" y2="12"/><line x1="12" y1="12" x2="5.8" y2="5.8"/>
    </g><circle cx="12" cy="12" r="2.6" fill="#0b0c0e" stroke="#d97757" stroke-width="1.6"/>
  </svg>`,
  collect: collectClaude,
};
