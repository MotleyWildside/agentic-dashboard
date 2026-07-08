import React from 'react';
import { IconButton, Stack, Tooltip, alpha, useTheme } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { useCompact } from '../hooks/useCompact.ts';

export interface EditControlsProps {
  onAddWidget: () => void;
  onResetLayout: () => void;
}

/** Floating add/reset controls shown in the bottom-right corner in edit mode. */
export function EditControls({ onAddWidget, onResetLayout }: EditControlsProps) {
  const theme = useTheme();
  const compact = useCompact();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: 'absolute',
        right: compact ? 16 : 28,
        bottom: compact ? 16 : 28,
        zIndex: 20,
      }}
    >
      <Tooltip title="Reset layout">
        <IconButton
          onClick={onResetLayout}
          aria-label="Reset layout"
          sx={{
            width: 46,
            height: 46,
            border: `1px solid ${theme.dashboard.palette.border}`,
            bgcolor: alpha(theme.palette.background.paper, 0.92),
            boxShadow: theme.shadows[4],
          }}
        >
          <RestartAltOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Add widget">
        <IconButton
          onClick={onAddWidget}
          aria-label="Add widget"
          sx={{
            width: 46,
            height: 46,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: theme.shadows[4],
            '&:hover': { bgcolor: theme.palette.primary.dark },
          }}
        >
          <AddOutlinedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
