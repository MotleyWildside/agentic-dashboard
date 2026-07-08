import React from 'react';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { WidgetShell } from './WidgetShell.tsx';
import type { WidgetRendererProps } from './types.ts';

/** Defensive read of the opaque pulse payload — never trusts its shape. */
function readPulse(data: unknown): { ticks: number | null; polledAt: string | null } {
  const d = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
  return {
    ticks: typeof d.ticks === 'number' ? d.ticks : null,
    polledAt: typeof d.polledAt === 'string' ? d.polledAt : null,
  };
}

function formatClock(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleTimeString();
}

/**
 * Reference custom widget renderer (ADR-0006): the counterpart to
 * server/plugins/example-pulse.ts. Draws the dashboard's poll heartbeat as a
 * pulsing ring plus real counters — proof that a plugin can render as something
 * other than the agent card, driven by its own Snapshot.widgetData payload.
 */
export function PulseWidget({ plugin, data, editMode, onRemove }: WidgetRendererProps) {
  const theme = useTheme();
  const { ticks, polledAt } = readPulse(data);
  const color = theme.dashboard.status.running;

  return (
    <WidgetShell
      title={plugin?.name || 'Dashboard Pulse'}
      subtitle={plugin?.id}
      editMode={editMode}
      onRemove={onRemove}
    >
      <Stack direction="column" alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 1 }}>
        <Box sx={{ position: 'relative', width: 56, height: 56, display: 'grid', placeItems: 'center' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              animation: data ? 'pulseRing 1.8s ease-out infinite' : 'none',
              opacity: data ? 1 : 0.3,
              '@keyframes pulseRing': {
                '0%': { transform: 'scale(0.6)', opacity: 0.7 },
                '100%': { transform: 'scale(1)', opacity: 0 },
              },
            }}
          />
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 12px ${alpha(color, 0.8)}` }} />
        </Box>
        <Stack direction="column" alignItems="center" spacing={0.25}>
          <Typography sx={{ fontFamily: theme.dashboard.fontMono, fontSize: 13, color: 'text.primary' }}>
            {ticks == null ? '—' : `${ticks} ticks`}
          </Typography>
          <Typography sx={{ fontFamily: theme.dashboard.fontMono, fontSize: 11, color: 'text.secondary' }}>
            last poll {formatClock(polledAt)}
          </Typography>
        </Stack>
      </Stack>
    </WidgetShell>
  );
}
