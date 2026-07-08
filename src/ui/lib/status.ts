/** Structural slice of the MUI theme this module needs — keeps the pure lib
 * decoupled from MUI (and importable from node:test without the module
 * augmentation in src/theme/mui-theme.d.ts). */
export interface StatusTheme {
  dashboard: {
    status: { running: string; idle: string; attention: string; error: string };
  };
}

/** Status → user-facing label. Extend together with the AgentStatus union
 * (shared/types.ts) and STATUS_PRIORITY (server/lib/state.ts). */
export function statusLabel(status: string): string {
  return ({
    running: 'RUNNING',
    idle: 'IDLE',
    needs_input: 'WAITING',
    waiting_approval: 'ATTENTION',
    blocked: 'ATTENTION',
    failed: 'ERROR',
    unknown: 'UNKNOWN',
  } as Record<string, string>)[status] || String(status || 'unknown').toUpperCase();
}

/** Status → theme token. Themes only define running/idle/attention/error;
 * this is the single place statuses map onto those four. */
export function statusColor(theme: StatusTheme, status: string): string {
  if (status === 'running') return theme.dashboard.status.running;
  if (status === 'idle' || status === 'unknown') return theme.dashboard.status.idle;
  if (status === 'failed' || status === 'error') return theme.dashboard.status.error;
  return theme.dashboard.status.attention;
}
