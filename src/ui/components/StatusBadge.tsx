import React from 'react';
import { Chip, alpha, useTheme } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { statusColor, statusLabel } from '../lib/status.ts';

export function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const color = statusColor(theme, status);
  return (
    <Chip
      size="small"
      icon={<CircleIcon sx={{ width: 8, height: 8, color: `${color} !important` }} />}
      label={statusLabel(status)}
      sx={{
        height: 28,
        borderRadius: '999px',
        color,
        bgcolor: alpha(color, status === 'idle' ? 0.08 : 0.14),
        border: `1px solid ${alpha(color, 0.26)}`,
        fontFamily: theme.dashboard.fontMono,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
        '.MuiChip-label': { px: 1 },
      }}
    />
  );
}
