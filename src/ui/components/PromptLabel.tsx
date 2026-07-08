import React from 'react';
import { Typography, useTheme } from '@mui/material';

export function PromptLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        color: theme.dashboard.palette.muted,
        fontFamily: theme.dashboard.fontMono,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      &gt; {children}
    </Typography>
  );
}
