import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import type { CardAgent, PluginInfo } from '../types.ts';

export function AgentIcon({ agent, plugin }: { agent: CardAgent; plugin: PluginInfo | undefined }) {
  const theme = useTheme();
  const logo = plugin?.logo?.trim();
  const isInlineLogo = logo?.startsWith('<');
  const isImageLogo = Boolean(logo && !isInlineLogo);
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        display: 'grid',
        placeItems: 'center',
        borderRadius: `${theme.dashboard.radius.md}px`,
        border: isImageLogo ? 'none' : `1px solid ${theme.dashboard.palette.border}`,
        overflow: 'hidden',
        bgcolor: isImageLogo ? 'transparent' : alpha(theme.dashboard.palette.elevated, 0.74),
        color: theme.palette.text.primary,
        fontFamily: theme.dashboard.fontMono,
        fontWeight: 800,
        '& svg': { width: 22, height: 22, display: 'block' },
        '& img': {
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          borderRadius: 'inherit',
        },
      }}
    >
      {logo
        ? isInlineLogo
          ? <Box sx={{ display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: logo }} />
          : <Box component="img" src={logo} alt={`${agent.name} logo`} draggable={false} />
        : (plugin?.icon || agent.icon || '◇')}
    </Box>
  );
}
