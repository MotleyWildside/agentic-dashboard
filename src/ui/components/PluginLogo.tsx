import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { PluginInfo } from '../types.ts';

export function PluginLogo({ plugin }: { plugin: PluginInfo }) {
  const theme = useTheme();
  if (plugin.logo) {
    return (
      <Box
        sx={{
          width: 18,
          height: 18,
          display: 'grid',
          placeItems: 'center',
          opacity: 0.9,
          '& svg': { width: 18, height: 18, display: 'block' },
        }}
        dangerouslySetInnerHTML={{ __html: plugin.logo }}
      />
    );
  }

  return (
    <Typography sx={{ color: theme.dashboard.palette.muted, fontFamily: theme.dashboard.fontMono, fontSize: 14 }}>
      {plugin.icon || '◇'}
    </Typography>
  );
}
