import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { fmtPercent } from '../lib/format.ts';
import type { CardAgent } from '../types.ts';

export function AgentLimits({ agent, compactView = false }: { agent: CardAgent; compactView?: boolean }) {
  const theme = useTheme();
  const limits = agent.rateLimits;
  const quotaItems = ([
    ['5h quota', limits?.shortWindowPercent],
    ['7d quota', limits?.longWindowPercent],
  ] as Array<[string, number | null | undefined]>).filter((entry): entry is [string, number] => typeof entry[1] === 'number');

  if (!quotaItems.length) return null;

  if (compactView) {
    return (
      <Typography
        sx={{
          color: 'text.secondary',
          fontFamily: theme.dashboard.fontMono,
          fontSize: 11,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        limits {quotaItems.map(([label, value]) => `${label.replace(' quota', '')} ${fmtPercent(value)}`).join(' · ')}
      </Typography>
    );
  }

  const resetText = limits?.resetsIn
    ? `limits.reset_in ${limits.resetsIn}`
    : limits?.resetAt
      ? `limits.reset_at ${new Date(limits.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : 'limits.live';

  return (
    <Box sx={{ mt: 'auto', display: 'grid', gap: 1.1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 11 }}>
          ⏱ &gt; {resetText}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1.5}>
        {quotaItems.map(([label, value]) => (
          <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.5, minWidth: 0 }}>
              <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 11 }}>{label}</Typography>
              <Typography sx={{ ml: 'auto', color: 'text.primary', fontFamily: theme.dashboard.fontMono, fontWeight: 800, fontSize: 11 }}>{fmtPercent(value)}</Typography>
            </Stack>
            <ProgressBar value={value} color={value > 35 ? theme.dashboard.status.attention : theme.palette.primary.main} height={4} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
