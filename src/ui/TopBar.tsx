import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import { useCompact } from './hooks/useCompact.ts';
import type { Snapshot } from '../../shared/types.ts';

export interface TopBarProps {
  snapshot: Snapshot;
  connected: boolean;
  onSettings: () => void;
  editMode: boolean;
  onToggleEdit: () => void;
}

export function TopBar({ snapshot, connected, onSettings, editMode, onToggleEdit }: TopBarProps) {
  const theme = useTheme();
  const compact = useCompact();
  const running = (snapshot.agents || []).filter((agent) => agent.status === 'running').length;
  const [clock, setClock] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      component="header"
      sx={{
        height: compact ? 44 : 56,
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 1.5,
        px: compact ? 1.25 : 2,
        borderBottom: `1px solid ${theme.dashboard.palette.border}`,
        bgcolor: alpha(theme.dashboard.appChrome?.background || theme.palette.background.paper, 0.86),
        backdropFilter: `blur(${theme.dashboard.effects.glassBlur || 0}px)`,
      }}
    >
      <Box
        sx={{
          width: compact ? 26 : 30,
          height: compact ? 26 : 30,
          display: 'grid',
          placeItems: 'center',
          borderRadius: `${theme.dashboard.radius.sm}px`,
          border: `1px solid ${theme.dashboard.palette.border}`,
          color: theme.palette.primary.main,
        }}
      >
        <TerminalOutlinedIcon fontSize="small" />
      </Box>
      <Typography sx={{ fontWeight: 800, letterSpacing: 0, whiteSpace: 'nowrap', fontSize: compact ? 14 : 16 }}>Mimiron</Typography>
      <Chip
        size="small"
        icon={<BoltOutlinedIcon sx={{ color: `${theme.dashboard.status.running} !important` }} />}
        label={`${running} agent${running === 1 ? '' : 's'} running`}
        sx={{
          ml: 1,
          borderRadius: '999px',
          color: 'text.primary',
          bgcolor: alpha(theme.dashboard.status.running, 0.11),
          border: `1px solid ${alpha(theme.dashboard.status.running, 0.22)}`,
          fontFamily: theme.dashboard.fontMono,
          fontSize: 12,
        }}
      />
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 13 }}>
        {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
      </Typography>
      <Tooltip title={connected ? 'Backend connected' : 'Backend unreachable'}>
        <CircleIcon
          sx={{
            width: 10,
            height: 10,
            color: connected ? theme.dashboard.status.running : theme.dashboard.status.error,
          }}
        />
      </Tooltip>
      <Tooltip title={editMode ? 'Done editing layout' : 'Edit layout'}>
        <IconButton
          onClick={onToggleEdit}
          size="small"
          aria-label={editMode ? 'Done editing layout' : 'Edit layout'}
          color={editMode ? 'primary' : 'default'}
        >
          {editMode ? <CheckOutlinedIcon fontSize="small" /> : <EditOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Settings">
        <IconButton onClick={onSettings} size="small" aria-label="Open settings">
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
