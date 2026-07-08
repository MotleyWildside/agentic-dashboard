import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { PluginInfo } from '../types.ts';

export function PluginLogo({ plugin }: { plugin: PluginInfo }) {
  const theme = useTheme();
  const logo = plugin.logo?.trim();
  if (logo) {
    const isInlineLogo = logo.startsWith('<');
    return (
      <Box
        sx={{
          width: 18,
          height: 18,
          display: 'grid',
          placeItems: 'center',
          opacity: 0.9,
          borderRadius: `${theme.dashboard.radius.sm}px`,
          overflow: 'hidden',
          '& svg': { width: 18, height: 18, display: 'block' },
          '& img': {
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            borderRadius: 'inherit',
          },
        }}
        {...(isInlineLogo
          ? { dangerouslySetInnerHTML: { __html: logo } }
          : { component: 'img', src: logo, alt: `${plugin.name} logo`, draggable: false })}
      />
    );
  }

  return (
    <Typography sx={{ color: theme.dashboard.palette.muted, fontFamily: theme.dashboard.fontMono, fontSize: 14 }}>
      {plugin.icon || '◇'}
    </Typography>
  );
}
