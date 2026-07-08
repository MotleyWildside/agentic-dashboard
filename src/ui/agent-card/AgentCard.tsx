import React from 'react';
import { Box, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { MetricChip } from '../components/MetricChip.tsx';
import { PromptLabel } from '../components/PromptLabel.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { useCompact } from '../hooks/useCompact.ts';
import { cardDensity } from '../lib/density.ts';
import { buildSessionRows, isActiveSession, sessionKey } from '../lib/sessions.ts';
import { statusColor } from '../lib/status.ts';
import { AgentIcon } from './AgentIcon.tsx';
import { AgentLimits } from './AgentLimits.tsx';
import { TaskRow } from './TaskRow.tsx';
import type { CardAgent, PluginInfo } from '../types.ts';

export interface AgentCardProps {
  agent: CardAgent;
  plugin: PluginInfo | undefined;
  widgetSize?: { w: number; h: number };
  editMode?: boolean;
  onRemove?: () => void;
}

export function AgentCard({ agent, plugin, widgetSize, editMode = false, onRemove }: AgentCardProps) {
  const theme = useTheme();
  const compact = useCompact();
  const sessions = agent.sessions || [];
  const sessionRows = buildSessionRows(sessions);
  const activeSessions = sessions.filter(isActiveSession);
  const waiting = sessions.filter((session) => ['needs_input', 'waiting_approval', 'blocked'].includes(session.status)).length;
  const color = statusColor(theme, agent.status);
  const size = widgetSize || { w: 6, h: 5 };
  const { small, medium, visibleSessionCount } = cardDensity(size, sessionRows.length);
  const metrics: Array<[string, React.ReactNode, boolean]> = [
    ['active', activeSessions.length || (agent.status === 'running' ? 1 : 0), false],
    [compact || small ? 'wait' : 'waiting', waiting, waiting > 0],
  ];

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: small ? 1 : compact ? 1.2 : 2.25,
        p: small ? 1.25 : compact ? 1.5 : 2.5,
        height: '100%',
        overflow: 'auto',
        pointerEvents: editMode ? 'none' : 'auto',
        borderRadius: `${theme.dashboard.radius.lg}px`,
        border: `1px solid ${agent.status === 'running' ? alpha(color, 0.36) : theme.dashboard.palette.border}`,
        bgcolor: alpha(theme.palette.background.paper, theme.dashboard.pack.components.card.surfaceOpacity),
        boxShadow: agent.status === 'running' && theme.dashboard.effects.glowStrength !== 'none'
          ? `0 0 0 1px ${alpha(color, 0.08)}, 0 0 28px ${alpha(color, 0.12)}`
          : 'none',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={small ? 1 : 1.5}>
        {!small && <AgentIcon agent={agent} plugin={plugin} />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: small ? 14 : 20, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.name}
          </Typography>
          {small && (
            <Typography sx={{ mt: 0.25, color: 'text.disabled', fontFamily: theme.dashboard.fontMono, fontSize: 10, whiteSpace: 'nowrap' }}>
              {plugin?.name || agent.id}
            </Typography>
          )}
        </Box>
        <StatusBadge status={agent.status} />
        {editMode && (
          <Tooltip title="Remove widget">
            <IconButton
              size="small"
              className="widget-action"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.();
              }}
              aria-label={`Remove ${agent.name} widget`}
              sx={{ ml: 0.25, pointerEvents: 'auto' }}
            >
              <CloseOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Box>
        {!small && <PromptLabel>sessions.active</PromptLabel>}
        <Box
          sx={{
            mt: small ? 0 : compact ? 0.75 : 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
          }}
        >
          {metrics.map(([label, value, attention]) => (
            <MetricChip key={label} label={label} value={value} attention={attention} />
          ))}
        </Box>
      </Box>

      {(!small || visibleSessionCount > 0) && (
      <Box sx={{ display: 'grid', gap: small ? 0.6 : compact ? 0.65 : 1, mt: 0.25, minHeight: 0, overflow: 'auto', pr: 0.25 }}>
        {!small && <PromptLabel>{agent.status === 'running' ? 'task.current' : 'task.recent'}</PromptLabel>}
        {sessionRows.length ? (
          sessionRows.slice(0, visibleSessionCount).map(({ session, depth }) => (
            <TaskRow key={sessionKey(session)} session={session} active={isActiveSession(session)} depth={depth} dense={small} />
          ))
        ) : !small ? (
          <Box sx={{ p: 2, border: `1px dashed ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px` }}>
            <Typography color="text.secondary">No recent sessions</Typography>
          </Box>
        ) : null}
      </Box>
      )}

      <Box sx={{ mt: 'auto', minHeight: 0, overflow: 'hidden' }}><AgentLimits agent={agent} compactView={small || medium} /></Box>
    </Box>
  );
}
