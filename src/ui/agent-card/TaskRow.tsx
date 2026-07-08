import React from 'react';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { PromptLabel } from '../components/PromptLabel.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { useCompact } from '../hooks/useCompact.ts';
import { fmtAgo, fmtNum, shortPath } from '../lib/format.ts';
import { effortLabel, sessionLabel } from '../lib/sessions.ts';
import { statusColor } from '../lib/status.ts';
import type { AgentSession } from '../../../shared/types.ts';

export function TaskRow({ session, active, depth = 0, dense = false }: { session: AgentSession; active: boolean; depth?: number; dense?: boolean }) {
  const theme = useTheme();
  const compact = useCompact() || dense;
  const color = active ? statusColor(theme, session.status) : theme.dashboard.status.idle;
  const effort = effortLabel(session.effort);
  const isChild = depth > 0;
  const contextText = session.contextTokens != null
    ? `${fmtNum(session.contextTokens)} / ${fmtNum(session.tokens?.limit)}`
    : `${Math.round(session.contextUsedPercent || 0)}%`;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        gap: isChild ? (compact ? 0.45 : 0.65) : (compact ? 1 : 1.4),
        p: isChild ? (compact ? 0.75 : 0.95) : (compact ? 1.5 : 2),
        pl: isChild ? (compact ? 3 : 3.6) : (compact ? 2 : 2.5),
        ml: isChild ? (compact ? 0.9 : 1.25) : 0,
        border: `1px solid ${active ? alpha(color, 0.38) : theme.dashboard.palette.border}`,
        borderRadius: `${theme.dashboard.radius.md}px`,
        bgcolor: active ? alpha(color, 0.07) : alpha(theme.dashboard.palette.elevated, 0.36),
        opacity: active ? 1 : isChild ? 0.72 : 0.58,
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: color,
          opacity: active ? 1 : 0.38,
        },
        ...(isChild ? {
          '&:after': {
            content: '""',
            position: 'absolute',
            left: compact ? 10 : 14,
            top: -1,
            bottom: -1,
            width: 1,
            bgcolor: alpha(color, active ? 0.38 : 0.2),
          },
        } : {}),
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 1.5, minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color,
              fontFamily: theme.dashboard.fontMono,
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            {isChild ? '└' : '>'}
          </Typography>
          <Box sx={{ minWidth: 0, display: 'grid', gap: 0.25 }}>
            <Typography sx={{ fontWeight: 700, fontSize: dense ? 13 : isChild ? 15 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              {sessionLabel(session)}
            </Typography>
            {!isChild && (
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontFamily: theme.dashboard.fontMono,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {shortPath(session.cwd)}
              </Typography>
            )}
            {(session.model || effort) && (
              <Typography
                sx={{
                  color: 'text.disabled',
                  fontFamily: theme.dashboard.fontMono,
                  fontSize: isChild ? 10.5 : 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {[session.model, effort ? `effort: ${effort}` : null].filter(Boolean).join(' / ')}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pt: 0.1 }}>
          <StatusBadge status={session.status} />
          {!dense && (
            <Typography sx={{ color: 'text.disabled', fontFamily: theme.dashboard.fontMono, fontSize: 12, whiteSpace: 'nowrap' }}>
              {fmtAgo(session.lastActivityAt)}
            </Typography>
          )}
        </Stack>
      </Box>

      {!isChild && (
        <Box sx={{ mt: compact ? 0.5 : 0.75, minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: 2,
              mb: 0.9,
              minWidth: 0,
            }}
          >
            <PromptLabel>context.window</PromptLabel>
            <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 12, whiteSpace: 'nowrap' }}>
              {contextText}
            </Typography>
          </Box>
          <ProgressBar value={session.contextUsedPercent || 0} color={color} height={theme.dashboard.progress.height} />
        </Box>
      )}
    </Box>
  );
}
