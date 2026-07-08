import React from 'react';
import { LinearProgress, alpha, useTheme } from '@mui/material';

export function ProgressBar({ value, color, height = 6 }: { value: number | null | undefined; color?: string; height?: number }) {
  const theme = useTheme();
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(0, Math.min(100, value || 0))}
      sx={{
        height,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.text.primary, 0.08),
        '& .MuiLinearProgress-bar': {
          borderRadius: 999,
          bgcolor: color || theme.palette.primary.main,
        },
      }}
    />
  );
}
