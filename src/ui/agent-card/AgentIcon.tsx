import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import type { CardAgent, PluginInfo } from '../types.ts';

export function AgentIcon({ agent, plugin }: { agent: CardAgent; plugin: PluginInfo | undefined }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        display: 'grid',
        placeItems: 'center',
        borderRadius: `${theme.dashboard.radius.md}px`,
        border: `1px solid ${theme.dashboard.palette.border}`,
        bgcolor: alpha(theme.dashboard.palette.elevated, 0.74),
        color: theme.palette.text.primary,
        fontFamily: theme.dashboard.fontMono,
        fontWeight: 800,
        '& svg': { width: 22, height: 22, display: 'block' },
      }}
    >
      {plugin?.logo
        ? <Box sx={{ display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: plugin.logo }} />
        : (plugin?.icon || agent.icon || '◇')}
    </Box>
  );
}
