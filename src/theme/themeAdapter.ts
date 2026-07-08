import { alpha, createTheme } from '@mui/material/styles';
import type { Shadows, Theme } from '@mui/material/styles';
import { validateThemePack, DEFAULT_THEME_ID } from '../../shared/theme-schema.ts';
import type { ThemePack } from '../../shared/types.ts';
import terminalConsole from '../../themes/terminal-console.json';
import graphiteMinimal from '../../themes/graphite-minimal.json';
import neonPink from '../../themes/neon-pink.json';
import futuristicControlRoom from '../../themes/futuristic-control-room.json';
import lightProductivity from '../../themes/light-productivity.json';
import amberRetroConsole from '../../themes/amber-retro-console.json';

export const builtInThemeModules: Record<string, ThemePack> = {
  'terminal-console': terminalConsole as ThemePack,
  'graphite-minimal': graphiteMinimal as ThemePack,
  'neon-pink': neonPink as ThemePack,
  'futuristic-control-room': futuristicControlRoom as ThemePack,
  'light-productivity': lightProductivity as ThemePack,
  'amber-retro-console': amberRetroConsole as ThemePack,
};

const fallback = terminalConsole as ThemePack;

export { validateThemePack, DEFAULT_THEME_ID };

function mergeDeep(base: any, patch: any): any {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = mergeDeep(base[key] || {}, value);
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

export function normalizeThemePack(
  theme: unknown,
  options: { source?: ThemePack['source'] } = {},
): { theme: ThemePack & { source: NonNullable<ThemePack['source']> }; errors: string[] } {
  const merged: ThemePack = mergeDeep(fallback, theme);
  const errors = validateThemePack(theme);
  return {
    theme: {
      ...merged,
      source: options.source || (theme as ThemePack | null | undefined)?.source || 'custom',
    },
    errors,
  };
}

function makeShadows(pack: ThemePack): Shadows {
  const base = pack.palette.background.default;
  const strength = pack.effects?.shadowStrength || 'medium';
  const opacity = strength === 'none' ? 0 : strength === 'subtle' ? 0.18 : strength === 'strong' ? 0.42 : 0.28;
  const shadow = `0 18px 50px ${alpha(base, opacity)}`;
  return Array.from({ length: 25 }, (_, index) => (index === 0 ? 'none' : shadow)) as Shadows;
}

export function createMuiThemeFromPack(pack: ThemePack): Theme {
  const primary = pack.palette.accent;
  const warning = pack.status.attention || pack.status.waiting;
  const success = pack.status.running;
  const error = pack.status.error;
  const border = pack.palette.border;

  return createTheme({
    palette: {
      mode: pack.mode,
      primary: { main: primary },
      success: { main: success },
      warning: { main: warning },
      error: { main: error },
      background: {
        default: pack.palette.background.default,
        paper: pack.palette.background.paper,
      },
      text: {
        primary: pack.palette.text.primary,
        secondary: pack.palette.text.secondary,
        disabled: pack.palette.text.dim || pack.palette.text.muted,
      },
      divider: pack.palette.divider || border,
    },
    typography: {
      fontFamily: pack.typography.fontUi,
      fontWeightRegular: pack.typography.bodyWeight,
      h1: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      h2: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      h3: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      h4: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      h5: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      h6: { fontWeight: pack.typography.headingWeight, letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    shape: {
      borderRadius: pack.radius.md,
    },
    shadows: makeShadows(pack),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { height: '100%' },
          body: {
            minHeight: '100%',
            overflow: 'hidden',
            backgroundColor: pack.palette.background.default,
          },
          '#root': { minHeight: '100vh' },
          '*': { boxSizing: 'border-box' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: pack.radius.sm,
            minHeight: 32,
          },
          outlined: {
            borderColor: border,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: pack.radius.sm,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            border: `${pack.components.card.borderWidth}px solid ${border}`,
          },
        },
      },
    },
    dashboard: {
      pack,
      fontMono: pack.typography.fontMono,
      palette: {
        elevated: pack.palette.background.elevated,
        border,
        muted: pack.palette.text.muted,
        dim: pack.palette.text.dim,
        accent: primary,
      },
      radius: pack.radius,
      status: pack.status,
      progress: pack.progress,
      effects: pack.effects,
      components: pack.components,
      appChrome: pack.appChrome,
      density: pack.spacing.density,
    },
  });
}
