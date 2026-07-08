/** Pure display formatters — no React, no MUI, unit-tested in test/ui-format.test.ts. */

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function fmtPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < 50) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function shortPath(cwd: string | null | undefined, max = 46): string {
  if (!cwd) return '—';
  let value = cwd.replace(/^\/Users\/[^/]+/, '~');
  if (value.length <= max) return value;
  const parts = value.split('/');
  while (parts.length > 3 && parts.join('/').length > max) parts.splice(1, 1);
  value = [parts[0], '…', ...parts.slice(1)].join('/');
  return value.length > max ? `…${value.slice(-max)}` : value;
}
