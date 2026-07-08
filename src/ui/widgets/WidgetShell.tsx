import React from 'react';
import { Box, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

export interface WidgetShellProps {
  title: string;
  subtitle?: string;
  editMode?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}

/**
 * Shared card frame for custom (non-agent-card) widget renderers (ADR-0006):
 * the same border/surface/radius as AgentCard plus the edit-mode remove button,
 * so every widget type looks and behaves consistently on the grid. The remove
 * button keeps the `.widget-action` class + pointerEvents:auto that
 * DashboardGrid's draggableCancel relies on.
 */
export function WidgetShell({ title, subtitle, editMode = false, onRemove, children }: WidgetShellProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2,
        height: '100%',
        overflow: 'auto',
        pointerEvents: editMode ? 'none' : 'auto',
        borderRadius: `${theme.dashboard.radius.lg}px`,
        border: `1px solid ${theme.dashboard.palette.border}`,
        bgcolor: alpha(theme.palette.background.paper, theme.dashboard.pack.components.card.surfaceOpacity),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 18, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ mt: 0.25, color: 'text.disabled', fontFamily: theme.dashboard.fontMono, fontSize: 10, whiteSpace: 'nowrap' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {editMode && (
          <Tooltip title="Remove widget">
            <IconButton
              size="small"
              className="widget-action"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.();
              }}
              aria-label={`Remove ${title} widget`}
              sx={{ ml: 0.25, pointerEvents: 'auto' }}
            >
              <CloseOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
    </Box>
  );
}
