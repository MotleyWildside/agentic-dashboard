import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { WidgetShell } from './WidgetShell.tsx';
import type { WidgetRendererProps } from './types.ts';

/**
 * Honest fallback renderer (ADR-0006) for a plugin whose widgetType has no
 * component in this bundle — e.g. a plugin newer than the built frontend.
 * Shows an explanatory placeholder instead of a blank tile or a crash.
 */
export function UnknownWidget({ plugin, editMode, onRemove }: WidgetRendererProps) {
  const theme = useTheme();
  return (
    <WidgetShell
      title={plugin?.name || plugin?.id || 'Unknown widget'}
      subtitle={plugin?.id}
      editMode={editMode}
      onRemove={onRemove}
    >
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          p: 2,
          border: `1px dashed ${theme.dashboard.palette.border}`,
          borderRadius: `${theme.dashboard.radius.md}px`,
        }}
      >
        <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 12, textAlign: 'center' }}>
          No renderer for widget type “{plugin?.widgetType}”. Rebuild the dashboard frontend (npm&nbsp;run&nbsp;build).
        </Typography>
      </Box>
    </WidgetShell>
  );
}
