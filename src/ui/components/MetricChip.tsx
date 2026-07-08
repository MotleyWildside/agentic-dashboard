import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

export function MetricChip({ label, value, attention }: { label: string; value: React.ReactNode; attention?: boolean }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0.75,
        minWidth: 0,
        px: 1.25,
        py: 0.75,
        border: `1px solid ${theme.dashboard.palette.border}`,
        borderRadius: `${theme.dashboard.radius.sm}px`,
        bgcolor: alpha(theme.dashboard.palette.elevated, 0.54),
        fontFamily: theme.dashboard.fontMono,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'inherit', fontSize: 10, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: attention ? theme.dashboard.status.attention : 'text.primary',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
