import type { AgentState, PluginLayout, ThemeListItem, ThemePack } from '../../shared/types.ts';

/** Theme selection state shared between main.tsx and the settings dialog. */
export interface ThemeState {
  themes: ThemeListItem[];
  selectedThemeId: string;
  activePack: ThemePack;
}

/** What the UI needs from a plugin — PluginMeta from the server, or the
 * minimal fallback built from mock agents when the backend is unreachable. */
export interface PluginInfo {
  id: string;
  name: string;
  icon?: string;
  logo?: string | null;
  layout?: Partial<PluginLayout>;
}

/** What AgentCard needs from an agent — a live AgentState from the snapshot,
 * or the placeholder stub for widgets whose agent has no data yet. */
export type CardAgent = Pick<AgentState, 'id' | 'name' | 'status' | 'sessions'> & {
  icon?: string;
  rateLimits?: AgentState['rateLimits'];
};
