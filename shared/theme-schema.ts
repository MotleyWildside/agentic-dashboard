/**
 * Theme pack schema — the single source of truth for what a valid theme JSON
 * looks like. Consumed by the Vite renderer (src/theme/themeAdapter.ts) and,
 * via the compiled dist-server/ output, by the Electron main process
 * (electron/main.cjs) — so both theme stores validate identically.
 *
 * A theme pack is a plain JSON object; see themes/*.json for examples and
 * docs/knowledge-base/wiki/themes/theme-json-schema.md for field docs.
 */

export const DEFAULT_THEME_ID = 'terminal-console';

/** Statuses every theme must provide a color for (see server/lib/state.ts). */
export const THEME_STATUS_KEYS = ['running', 'idle', 'waiting', 'attention', 'error'] as const;

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/** Returns an array of human-readable errors; empty array = valid. */
export function validateThemePack(theme: any): string[] {
  const errors: string[] = [];
  if (!theme || typeof theme !== 'object') errors.push('Theme must be a JSON object.');
  if (!theme?.id || !/^[a-z0-9-]+$/.test(theme.id)) errors.push('id is required and must use lowercase letters, numbers, and hyphens.');
  if (!theme?.name) errors.push('name is required.');
  if (!['dark', 'light'].includes(theme?.mode)) errors.push('mode must be "dark" or "light".');
  if (!isHex(theme?.palette?.background?.default)) errors.push('palette.background.default must be a hex color.');
  if (!isHex(theme?.palette?.background?.paper)) errors.push('palette.background.paper must be a hex color.');
  if (!isHex(theme?.palette?.text?.primary)) errors.push('palette.text.primary must be a hex color.');
  if (!isHex(theme?.palette?.accent)) errors.push('palette.accent must be a hex color.');
  for (const status of THEME_STATUS_KEYS) {
    if (!isHex(theme?.status?.[status])) errors.push(`status.${status} must be a hex color.`);
  }
  return errors;
}
