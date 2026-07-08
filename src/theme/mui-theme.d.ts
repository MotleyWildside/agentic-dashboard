/**
 * MUI theme module augmentation — adds the custom `dashboard` token bag that
 * createMuiThemeFromPack (src/theme/themeAdapter.ts) attaches to every theme
 * and that components read as `theme.dashboard.*`.
 */
import type { ThemePack } from '../../shared/types.ts';

interface DashboardThemeTokens {
  pack: ThemePack;
  fontMono: string;
  palette: {
    elevated: string;
    border: string;
    muted: string;
    dim?: string;
    accent: string;
  };
  radius: ThemePack['radius'];
  status: ThemePack['status'];
  progress: ThemePack['progress'];
  effects: ThemePack['effects'];
  components: ThemePack['components'];
  appChrome?: ThemePack['appChrome'];
  density: string;
}

declare module '@mui/material/styles' {
  interface Theme {
    dashboard: DashboardThemeTokens;
  }
  interface ThemeOptions {
    dashboard?: DashboardThemeTokens;
  }
}

// MUI v9 dropped the flexbox system-prop typings from Stack; the app still
// passes them (carried over from the JSX version), so keep them accepted by
// the type checker without changing runtime behavior.
declare module '@mui/material/Stack' {
  interface StackOwnProps {
    alignItems?: import('react').CSSProperties['alignItems'];
    justifyContent?: import('react').CSSProperties['justifyContent'];
    flexWrap?: import('react').CSSProperties['flexWrap'];
  }
}
