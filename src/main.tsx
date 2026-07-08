import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import App from './ui/App.tsx';
import type { ThemeState } from './ui/App.tsx';
import type { ThemeApi, ThemeListItem } from '../shared/types.ts';
import { builtInThemeModules, createMuiThemeFromPack, normalizeThemePack, DEFAULT_THEME_ID } from './theme/themeAdapter.ts';

declare global {
  interface Window {
    /** Electron IPC theme store (electron/preload.cjs); absent in the browser. */
    agentThemes?: ThemeApi;
  }
}

function getStoredCustomThemes(): ThemeListItem[] {
  try {
    return JSON.parse(localStorage.getItem('agent-control.customThemes') || '[]');
  } catch {
    return [];
  }
}

function setStoredCustomThemes(themes: ThemeListItem[]) {
  localStorage.setItem('agent-control.customThemes', JSON.stringify(themes));
}

function createBrowserThemeApi(): ThemeApi {
  const builtIns = Object.values(builtInThemeModules).map((theme) => normalizeThemePack(theme, { source: 'built-in' }).theme);
  return {
    async list() {
      return {
        themes: [...builtIns.map((theme) => ({ theme, source: 'built-in' as const })), ...getStoredCustomThemes()],
        selectedThemeId: localStorage.getItem('agent-control.selectedThemeId') || DEFAULT_THEME_ID,
      };
    },
    async setSelected(themeId) {
      localStorage.setItem('agent-control.selectedThemeId', themeId);
      return { ok: true };
    },
    async importTheme(jsonText) {
      const parsed = JSON.parse(jsonText);
      const { theme, errors } = normalizeThemePack(parsed, { source: 'custom' });
      if (errors.length) return { ok: false, errors };
      const themes = getStoredCustomThemes().filter((item) => item.theme.id !== theme.id);
      themes.push({ theme, source: 'custom' });
      setStoredCustomThemes(themes);
      localStorage.setItem('agent-control.selectedThemeId', theme.id);
      return { ok: true, theme };
    },
    async deleteCustom(themeId) {
      setStoredCustomThemes(getStoredCustomThemes().filter((item) => item.theme.id !== themeId));
      if (localStorage.getItem('agent-control.selectedThemeId') === themeId) {
        localStorage.setItem('agent-control.selectedThemeId', DEFAULT_THEME_ID);
      }
      return { ok: true };
    },
    async reset() {
      localStorage.setItem('agent-control.selectedThemeId', DEFAULT_THEME_ID);
      return { ok: true };
    },
    async exportTheme(themeId) {
      const listed = await this.list();
      const found = listed.themes.find((item) => item.theme.id === themeId);
      return { ok: Boolean(found), jsonText: found ? JSON.stringify(found.theme, null, 2) : '' };
    },
  };
}

function AppRoot() {
  const [themeState, setThemeState] = React.useState<ThemeState>({
    themes: [],
    selectedThemeId: DEFAULT_THEME_ID,
    activePack: normalizeThemePack(builtInThemeModules[DEFAULT_THEME_ID], { source: 'built-in' }).theme,
  });

  const themeApi = React.useMemo(() => window.agentThemes || createBrowserThemeApi(), []);

  const refreshThemes = React.useCallback(async () => {
    const result = await themeApi.list();
    const themes = result.themes || [];
    const active = themes.find((item) => item.theme.id === result.selectedThemeId)?.theme
      || themes.find((item) => item.theme.id === DEFAULT_THEME_ID)?.theme
      || normalizeThemePack(builtInThemeModules[DEFAULT_THEME_ID], { source: 'built-in' }).theme;
    setThemeState({ themes, selectedThemeId: active.id, activePack: active });
  }, [themeApi]);

  React.useEffect(() => {
    refreshThemes();
  }, [refreshThemes]);

  const muiTheme = React.useMemo(() => createMuiThemeFromPack(themeState.activePack), [themeState.activePack]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <App
        themeApi={themeApi}
        themeState={themeState}
        refreshThemes={refreshThemes}
      />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<AppRoot />);
