import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import { loadAgentConfig, saveDashboardSettings, subscribeSnapshot } from '../data/api.js';
import { mockSnapshot } from '../data/mockAgents.js';

const ACTIVE_STATUSES = new Set(['running', 'needs_input', 'waiting_approval', 'blocked', 'failed']);
const ResponsiveGridLayout = WidthProvider(Responsive);
const GRID_COLS = { lg: 12, md: 12, sm: 6, xs: 1, xxs: 1 };
const GRID_BREAKPOINTS = { lg: 1200, md: 900, sm: 640, xs: 360, xxs: 0 };
const DEFAULT_WIDGET_LAYOUT = { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 };

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWidget(widget, plugin) {
  const layout = { ...DEFAULT_WIDGET_LAYOUT, ...(plugin?.layout || {}) };
  const w = Number.isFinite(widget.w) ? widget.w : layout.defaultW;
  const h = Number.isFinite(widget.h) ? widget.h : layout.defaultH;
  const clampedW = clampNumber(Math.round(w), layout.minW, layout.maxW);
  return {
    widgetId: widget.widgetId,
    pluginId: widget.pluginId,
    x: clampNumber(Math.round(Number.isFinite(widget.x) ? widget.x : 0), 0, GRID_COLS.lg - clampedW),
    y: Math.max(0, Math.round(Number.isFinite(widget.y) ? widget.y : 0)),
    w: clampedW,
    h: clampNumber(Math.round(h), layout.minH, layout.maxH),
  };
}

function makeWidgetId(pluginId) {
  return `${pluginId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findOpenPosition(widgets, size, cols = 12) {
  const w = Math.min(size.w, cols);
  const h = size.h;
  for (let y = 0; y < 80; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      const candidate = { x, y, w, h };
      if (!widgets.some((widget) => overlaps(candidate, widget))) return { x, y };
    }
  }
  return { x: 0, y: widgets.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0) };
}

function widgetsToLayout(widgets, pluginsById) {
  return widgets.map((widget) => {
    const limits = { ...DEFAULT_WIDGET_LAYOUT, ...(pluginsById.get(widget.pluginId)?.layout || {}) };
    return {
      i: widget.widgetId,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: limits.minW,
      minH: limits.minH,
      maxW: limits.maxW,
      maxH: limits.maxH,
    };
  });
}

function isValidLayoutItem(item) {
  return item && typeof item.i === 'string'
    && Number.isFinite(item.x)
    && Number.isFinite(item.y)
    && Number.isFinite(item.w)
    && Number.isFinite(item.h);
}

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function fmtPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function fmtAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 50) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function shortPath(cwd, max = 46) {
  if (!cwd) return '—';
  let value = cwd.replace(/^\/Users\/[^/]+/, '~');
  if (value.length <= max) return value;
  const parts = value.split('/');
  while (parts.length > 3 && parts.join('/').length > max) parts.splice(1, 1);
  value = [parts[0], '…', ...parts.slice(1)].join('/');
  return value.length > max ? `…${value.slice(-max)}` : value;
}

function effortLabel(effort) {
  if (!effort) return null;
  if (typeof effort === 'string') return effort;
  return effort.level || effort.type || effort.name || null;
}

function isActiveSession(session) {
  return ACTIVE_STATUSES.has(session?.status) || session?.needsApproval;
}

function sessionKey(session) {
  return session?.threadId || session?.sessionId;
}

function sessionLabel(session) {
  if (session?.threadSource === 'subagent') {
    return session.agentNickname || session.agentRole || 'sub-agent';
  }
  return session?.projectName || 'session';
}

function buildSessionRows(sessions) {
  const byId = new Map();
  for (const session of sessions) {
    const key = sessionKey(session);
    if (key) byId.set(key, session);
  }

  const childrenByParent = new Map();
  const roots = [];
  for (const session of sessions) {
    const parentId = session.parentThreadId;
    if (session.threadSource === 'subagent' && parentId && byId.has(parentId)) {
      const children = childrenByParent.get(parentId) || [];
      children.push(session);
      childrenByParent.set(parentId, children);
    } else {
      roots.push(session);
    }
  }

  const rows = [];
  for (const root of roots) {
    rows.push({ session: root, depth: 0 });
    const children = childrenByParent.get(sessionKey(root)) || [];
    for (const child of children) rows.push({ session: child, depth: 1 });
  }
  return rows;
}

function statusLabel(status) {
  return ({
    running: 'RUNNING',
    idle: 'IDLE',
    needs_input: 'WAITING',
    waiting_approval: 'ATTENTION',
    blocked: 'ATTENTION',
    failed: 'ERROR',
    unknown: 'UNKNOWN',
  })[status] || String(status || 'unknown').toUpperCase();
}

function statusColor(theme, status) {
  if (status === 'running') return theme.dashboard.status.running;
  if (status === 'idle' || status === 'unknown') return theme.dashboard.status.idle;
  if (status === 'failed' || status === 'error') return theme.dashboard.status.error;
  return theme.dashboard.status.attention;
}

function MetricChip({ label, value, attention }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0.75,
        minWidth: 0,
        px: 1.25,
        py: 0.75,
        border: `1px solid ${theme.dashboard.palette.border}`,
        borderRadius: `${theme.dashboard.radius.sm}px`,
        bgcolor: alpha(theme.dashboard.palette.elevated, 0.54),
        fontFamily: theme.dashboard.fontMono,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'inherit', fontSize: 10, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: attention ? theme.dashboard.status.attention : 'text.primary',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function StatusBadge({ status }) {
  const theme = useTheme();
  const color = statusColor(theme, status);
  return (
    <Chip
      size="small"
      icon={<CircleIcon sx={{ width: 8, height: 8, color: `${color} !important` }} />}
      label={statusLabel(status)}
      sx={{
        height: 28,
        borderRadius: '999px',
        color,
        bgcolor: alpha(color, status === 'idle' ? 0.08 : 0.14),
        border: `1px solid ${alpha(color, 0.26)}`,
        fontFamily: theme.dashboard.fontMono,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
        '.MuiChip-label': { px: 1 },
      }}
    />
  );
}

function PromptLabel({ children }) {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        color: theme.dashboard.palette.muted,
        fontFamily: theme.dashboard.fontMono,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      &gt; {children}
    </Typography>
  );
}

function ProgressBar({ value, color, height = 6 }) {
  const theme = useTheme();
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(0, Math.min(100, value || 0))}
      sx={{
        height,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.text.primary, 0.08),
        '& .MuiLinearProgress-bar': {
          borderRadius: 999,
          bgcolor: color || theme.palette.primary.main,
        },
      }}
    />
  );
}

function AgentLimits({ agent, compactView = false }) {
  const theme = useTheme();
  const limits = agent.rateLimits;
  const quotaItems = [
    ['5h quota', limits?.shortWindowPercent],
    ['7d quota', limits?.longWindowPercent],
  ].filter(([, value]) => typeof value === 'number');

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

function AgentIcon({ agent }) {
  const theme = useTheme();
  const letter = agent.id === 'codex' ? 'C' : '✶';
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
        color: agent.id === 'claude' ? '#d97757' : theme.palette.text.primary,
        fontFamily: theme.dashboard.fontMono,
        fontWeight: 800,
      }}
    >
      {letter}
    </Box>
  );
}

function PluginLogo({ plugin }) {
  const theme = useTheme();
  if (plugin.logo) {
    return (
      <Box
        sx={{
          width: 18,
          height: 18,
          display: 'grid',
          placeItems: 'center',
          opacity: 0.9,
          '& svg': { width: 18, height: 18, display: 'block' },
        }}
        dangerouslySetInnerHTML={{ __html: plugin.logo }}
      />
    );
  }

  return (
    <Typography sx={{ color: theme.dashboard.palette.muted, fontFamily: theme.dashboard.fontMono, fontSize: 14 }}>
      {plugin.icon || '◇'}
    </Typography>
  );
}

function TaskRow({ session, active, depth = 0 }) {
  const theme = useTheme();
  const compact = useMediaQuery('(max-height: 700px), (max-width: 1100px)');
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
            <Typography sx={{ fontWeight: 700, fontSize: isChild ? 15 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
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
          <Typography sx={{ color: 'text.disabled', fontFamily: theme.dashboard.fontMono, fontSize: 12, whiteSpace: 'nowrap' }}>
            {fmtAgo(session.lastActivityAt)}
          </Typography>
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

function AgentCard({ agent, plugin, widgetSize, editMode = false, onRemove }) {
  const theme = useTheme();
  const compact = useMediaQuery('(max-height: 700px), (max-width: 1100px)');
  const sessions = agent.sessions || [];
  const sessionRows = buildSessionRows(sessions);
  const activeSessions = sessions.filter(isActiveSession);
  const primary = activeSessions.find((session) => session.threadSource !== 'subagent') || activeSessions[0] || sessions.find((session) => session.threadSource !== 'subagent') || sessions[0];
  const waiting = sessions.filter((session) => ['needs_input', 'waiting_approval', 'blocked'].includes(session.status)).length;
  const color = statusColor(theme, agent.status);
  const size = widgetSize || { w: 6, h: 5 };
  const small = size.w <= 3 || size.h <= 2;
  const medium = !small && size.h <= 4;
  const visibleSessionCount = small ? 0 : sessionRows.length;
  const metrics = [
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
        {!small && <AgentIcon agent={agent} />}
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

      {small && <AgentLimits agent={agent} compactView />}

      {!small && (
      <Box sx={{ display: 'grid', gap: compact ? 0.65 : 1, mt: 0.25, minHeight: 0, overflow: 'auto', pr: 0.25 }}>
        <PromptLabel>{agent.status === 'running' ? 'task.current' : 'task.recent'}</PromptLabel>
        {sessionRows.length ? (
          sessionRows.slice(0, visibleSessionCount).map(({ session, depth }) => (
            <TaskRow key={sessionKey(session)} session={session} active={isActiveSession(session)} depth={depth} />
          ))
        ) : (
          <Box sx={{ p: 2, border: `1px dashed ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px` }}>
            <Typography color="text.secondary">No recent sessions</Typography>
          </Box>
        )}
      </Box>
      )}

      {!small && <Box sx={{ mt: 'auto', minHeight: 0, overflow: 'hidden' }}><AgentLimits agent={agent} compactView={medium} /></Box>}
    </Box>
  );
}

function TopBar({ snapshot, onSettings, editMode, onToggleEdit }) {
  const theme = useTheme();
  const compact = useMediaQuery('(max-height: 700px), (max-width: 1100px)');
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
      <Typography sx={{ fontWeight: 800, letterSpacing: 0, whiteSpace: 'nowrap', fontSize: compact ? 14 : 16 }}>Agent Control</Typography>
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
      <Tooltip title="Backend connected">
        <CircleIcon sx={{ width: 10, height: 10, color: '#22C55E' }} />
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

function SettingsDialog({ open, onClose, themeApi, themeState, refreshThemes }) {
  const theme = useTheme();
  const [error, setError] = React.useState('');
  const fileRef = React.useRef(null);

  async function selectTheme(themeId) {
    await themeApi.setSelected(themeId);
    await refreshThemes();
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    try {
      const result = await themeApi.importTheme(text);
      if (!result.ok) {
        setError((result.errors || ['Invalid theme configuration']).join(' '));
        return;
      }
      setError('');
      await refreshThemes();
    } catch (err) {
      setError(err.message || 'Invalid theme configuration');
    }
  }

  async function exportTheme() {
    const result = await themeApi.exportTheme(themeState.selectedThemeId);
    if (!result.ok) return;
    const blob = new Blob([result.jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeState.selectedThemeId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetTheme() {
    await themeApi.reset();
    setError('');
    await refreshThemes();
  }

  async function deleteTheme(themeId) {
    await themeApi.deleteCustom(themeId);
    await refreshThemes();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">Settings</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
              Appearance
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' }, gap: 2.5, mt: 1 }}>
            <Box>
              <PromptLabel>themes.available</PromptLabel>
              <List sx={{ mt: 1, border: `1px solid ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px`, overflow: 'hidden' }}>
                {themeState.themes.map(({ theme: pack, source }) => (
                  <ListItemButton
                    key={pack.id}
                    selected={pack.id === themeState.selectedThemeId}
                    onClick={() => selectTheme(pack.id)}
                    sx={{ borderBottom: `1px solid ${theme.dashboard.palette.border}`, '&:last-child': { borderBottom: 0 } }}
                  >
                    <ListItemText
                      primary={pack.name}
                      secondary={`${source === 'built-in' ? 'Built-in' : 'Custom'} · ${pack.mode} · v${pack.version || '1.0.0'}`}
                      primaryTypographyProps={{ fontWeight: 700 }}
                      secondaryTypographyProps={{ fontFamily: theme.dashboard.fontMono, fontSize: 11 }}
                    />
                    {source !== 'built-in' && (
                      <Tooltip title="Delete custom theme">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteTheme(pack.id);
                          }}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemButton>
                ))}
              </List>
            </Box>
            <Box>
              <PromptLabel>theme.preview</PromptLabel>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  border: `1px solid ${theme.dashboard.palette.border}`,
                  borderRadius: `${theme.dashboard.radius.md}px`,
                  bgcolor: alpha(theme.dashboard.palette.elevated, 0.52),
                  display: 'grid',
                  gap: 1.5,
                }}
              >
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {['running', 'waiting', 'idle', 'error'].map((status) => <StatusBadge key={status} status={status} />)}
                </Stack>
                <Divider />
                <MetricChip label="accent" value={themeState.activePack.palette.accent} />
                <ProgressBar value={58} />
                {error && <Alert severity="error">{error}</Alert>}
                {!error && (
                  <Alert severity="info" sx={{ bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                    Invalid theme JSON will be rejected here instead of crashing the renderer.
                  </Alert>
                )}
              </Box>
            </Box>
          </Box>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button startIcon={<UploadFileOutlinedIcon />} variant="outlined" onClick={() => fileRef.current?.click()}>Import JSON</Button>
        <Button startIcon={<DownloadOutlinedIcon />} variant="outlined" onClick={exportTheme}>Export</Button>
        <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={resetTheme}>Reset</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} variant="contained">Done</Button>
      </DialogActions>
    </Dialog>
  );
}

function AddWidgetDialog({ open, plugins, onClose, onAdd }) {
  const theme = useTheme();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Add widget</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
          Choose a plugin type for the dashboard
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {plugins.map((plugin) => (
            <Button
              key={plugin.id}
              variant="outlined"
              onClick={() => onAdd(plugin)}
              sx={{
                minHeight: 58,
                px: 1.5,
                justifyContent: 'flex-start',
                borderColor: theme.dashboard.palette.border,
                bgcolor: alpha(theme.dashboard.palette.elevated, 0.34),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                <PluginLogo plugin={plugin} />
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.2 }}>
                    {plugin.name}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 11 }}>
                    {plugin.id}
                  </Typography>
                </Box>
              </Stack>
            </Button>
          ))}
          {!plugins.length && (
            <Box sx={{ p: 2, border: `1px dashed ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px`, color: 'text.secondary' }}>
              No plugins registered
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function App({ themeApi, themeState, refreshThemes }) {
  const theme = useTheme();
  const compact = useMediaQuery('(max-height: 700px), (max-width: 1100px)');
  const canEditLayout = useMediaQuery('(min-width: 900px)');
  const [snapshot, setSnapshot] = React.useState(mockSnapshot);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = React.useState(false);
  const [layoutError, setLayoutError] = React.useState('');
  const [liveLayout, setLiveLayout] = React.useState(null);
  const [agentConfig, setAgentConfig] = React.useState({ plugins: [], settings: { plugins: {} }, snapshotAgents: mockSnapshot.agents, snapshotProcesses: {} });
  const visibleAgents = Array.isArray(snapshot.agents) ? snapshot.agents : mockSnapshot.agents;
  const pluginsById = React.useMemo(() => new Map(agentConfig.plugins.map((plugin) => [plugin.id, plugin])), [agentConfig.plugins]);
  const agentsById = React.useMemo(() => new Map(visibleAgents.map((agent) => [agent.id, agent])), [visibleAgents]);
  const dashboardWidgets = React.useMemo(() => {
    const widgets = agentConfig.settings?.dashboard?.widgets || [];
    return widgets
      .filter((widget) => widget?.widgetId && widget?.pluginId && pluginsById.has(widget.pluginId))
      .map((widget) => normalizeWidget(widget, pluginsById.get(widget.pluginId)));
  }, [agentConfig.settings, pluginsById]);
  const layouts = React.useMemo(() => {
    const lg = widgetsToLayout(dashboardWidgets, pluginsById);
    const sm = dashboardWidgets.map((widget, index) => ({ i: widget.widgetId, x: index % 2 ? 3 : 0, y: Math.floor(index / 2) * 4, w: 3, h: Math.max(3, Math.min(5, widget.h)) }));
    const single = dashboardWidgets.map((widget, index) => ({ i: widget.widgetId, x: 0, y: index * 4, w: 1, h: Math.max(3, Math.min(5, widget.h)) }));
    return { lg, md: lg, sm, xs: single, xxs: single };
  }, [dashboardWidgets, pluginsById]);
  const liveWidgets = React.useMemo(() => {
    if (!Array.isArray(liveLayout)) return dashboardWidgets;
    const layoutById = new Map(liveLayout.filter(isValidLayoutItem).map((item) => [item.i, item]));
    return dashboardWidgets.map((widget) => {
      const item = layoutById.get(widget.widgetId);
      return item
        ? normalizeWidget({ ...widget, x: item.x, y: item.y, w: item.w, h: item.h }, pluginsById.get(widget.pluginId))
        : widget;
    });
  }, [dashboardWidgets, liveLayout, pluginsById]);

  React.useEffect(() => subscribeSnapshot(setSnapshot), []);

  React.useEffect(() => {
    if (!canEditLayout && editMode) setEditMode(false);
  }, [canEditLayout, editMode]);

  React.useEffect(() => {
    if (!editMode) setLiveLayout(null);
  }, [editMode]);

  React.useEffect(() => {
    setLiveLayout(null);
  }, [dashboardWidgets.length]);

  const refreshAgentConfig = React.useCallback(async () => {
    try {
      const result = await loadAgentConfig();
      setAgentConfig((current) => ({ ...current, ...result }));
    } catch {
      setAgentConfig((current) => ({
        ...current,
        plugins: current.plugins.length ? current.plugins : mockSnapshot.agents.map((agent) => ({ id: agent.id, name: agent.name, icon: agent.icon })),
      }));
    }
  }, []);

  React.useEffect(() => {
    refreshAgentConfig();
  }, [refreshAgentConfig]);

  React.useEffect(() => {
    setAgentConfig((current) => ({
      ...current,
      snapshotAgents: snapshot.agents || [],
      snapshotProcesses: snapshot.processes || {},
    }));
  }, [snapshot]);

  async function saveDashboard(widgets) {
    setLayoutError('');
    const dashboard = {
      widgets: widgets
        .filter((widget) => widget?.widgetId && widget?.pluginId)
        .map((widget) => normalizeWidget(widget, pluginsById.get(widget.pluginId))),
    };
    setAgentConfig((current) => ({
      ...current,
      settings: {
        ...(current.settings || {}),
        dashboard,
      },
    }));
    try {
      const nextSettings = await saveDashboardSettings(dashboard);
      setAgentConfig((current) => ({ ...current, settings: nextSettings }));
      fetch('/api/status').then((res) => res.json()).then(setSnapshot).catch(() => {});
    } catch (err) {
      setLayoutError(err.message || 'Failed to save dashboard layout.');
      await refreshAgentConfig();
    }
  }

  function applyGridLayout(layout) {
    if (!Array.isArray(layout) || !layout.every(isValidLayoutItem)) {
      setLayoutError('Layout change was ignored because the grid returned invalid geometry.');
      return;
    }
    const layoutById = new Map(layout.map((item) => [item.i, item]));
    const nextWidgets = dashboardWidgets.map((widget) => {
      const item = layoutById.get(widget.widgetId);
      return item ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h } : widget;
    });
    saveDashboard(nextWidgets);
  }

  function previewGridLayout(layout) {
    if (Array.isArray(layout) && layout.every(isValidLayoutItem)) {
      setLiveLayout(layout);
    }
  }

  function commitGridLayout(layout) {
    setLiveLayout(null);
    applyGridLayout(layout);
  }

  function addWidget(plugin) {
    const limits = { ...DEFAULT_WIDGET_LAYOUT, ...(plugin.layout || {}) };
    const size = { w: limits.defaultW, h: limits.defaultH };
    const position = findOpenPosition(dashboardWidgets, size, 12);
    const nextWidget = {
      widgetId: makeWidgetId(plugin.id),
      pluginId: plugin.id,
      x: position.x,
      y: position.y,
      w: size.w,
      h: size.h,
    };
    setAddWidgetOpen(false);
    saveDashboard([...dashboardWidgets, nextWidget]);
  }

  function removeWidget(widgetId) {
    saveDashboard(dashboardWidgets.filter((widget) => widget.widgetId !== widgetId));
  }

  function resetLayout() {
    saveDashboard([]);
  }

  function openAddWidget() {
    if (canEditLayout) setEditMode(true);
    setAddWidgetOpen(true);
  }

  function agentForWidget(widget) {
    const plugin = pluginsById.get(widget.pluginId);
    return agentsById.get(widget.pluginId) || {
      id: widget.pluginId,
      name: plugin?.name || widget.pluginId,
      icon: plugin?.icon || '◇',
      status: 'unknown',
      sessions: [],
      rateLimits: null,
    };
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        backgroundImage: theme.dashboard.effects.backgroundNoise
          ? `linear-gradient(${alpha(theme.palette.text.primary, 0.018)} 1px, transparent 1px)`
          : 'none',
        backgroundSize: '100% 4px',
      }}
    >
      <TopBar
        snapshot={snapshot}
        onSettings={() => setSettingsOpen(true)}
        editMode={editMode}
        onToggleEdit={() => canEditLayout && setEditMode((value) => !value)}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          position: 'relative',
        }}
      >
        <Box
          component="main"
          sx={{
            minHeight: 0,
            position: 'relative',
            p: compact ? 1 : { xs: 1.5, lg: 3 },
            overflow: 'auto',
            '& .react-grid-layout': {
              position: 'relative',
              minHeight: '100%',
            },
            '& .react-grid-item': {
              transition: editMode ? 'none' : 'transform 180ms ease',
              cursor: editMode ? 'grab' : 'default',
            },
            '& .react-grid-item.react-draggable-dragging': {
              cursor: 'grabbing',
            },
            '& .react-grid-item.react-draggable-dragging > *': {
              opacity: 0.62,
              filter: 'saturate(0.85)',
              pointerEvents: 'none',
            },
            '& .react-grid-item.react-grid-placeholder': {
              opacity: '1 !important',
              bgcolor: alpha(theme.palette.primary.main, 0.2),
              border: `2px solid ${alpha(theme.palette.primary.main, 0.7)}`,
              borderRadius: `${theme.dashboard.radius.lg}px`,
              boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.32)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.18)}`,
              transition: 'none',
            },
            '& .react-resizable-handle': {
              width: 28,
              height: 28,
              right: 2,
              bottom: 2,
              opacity: editMode ? 1 : 0,
              borderRadius: `${theme.dashboard.radius.sm}px 0 ${theme.dashboard.radius.lg}px 0`,
              background: `linear-gradient(135deg, transparent 0 46%, ${alpha(theme.palette.primary.main, 0.14)} 46% 100%)`,
              transition: 'opacity 140ms ease, background-color 140ms ease',
              cursor: 'nwse-resize',
              '&:hover': {
                background: `linear-gradient(135deg, transparent 0 42%, ${alpha(theme.palette.primary.main, 0.26)} 42% 100%)`,
              },
            },
            '& .react-resizable-handle::before': {
              content: '""',
              position: 'absolute',
              right: 7,
              bottom: 7,
              width: 12,
              height: 12,
              borderRight: `2px solid ${alpha(theme.palette.primary.main, 0.95)}`,
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.95)}`,
              borderRadius: 0.5,
            },
            '& .react-resizable-handle::after': {
              content: '""',
              position: 'absolute',
              right: 12,
              bottom: 12,
              width: 7,
              height: 7,
              borderRight: `2px solid ${alpha(theme.palette.primary.main, 0.62)}`,
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.62)}`,
              borderRadius: 0.5,
            },
          }}
        >
          {layoutError && <Alert severity="error" sx={{ mb: 1.5 }}>{layoutError}</Alert>}
          {dashboardWidgets.length ? (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={GRID_BREAKPOINTS}
              cols={GRID_COLS}
              rowHeight={68}
              margin={[compact ? 8 : 14, compact ? 8 : 14]}
              containerPadding={[0, 0]}
              compactType={null}
              preventCollision
              isBounded
              isDraggable={editMode && canEditLayout}
              isResizable={editMode && canEditLayout}
              resizeHandles={['se']}
              draggableCancel=".widget-action, .react-resizable-handle"
              onDrag={previewGridLayout}
              onDragStop={commitGridLayout}
              onResize={previewGridLayout}
              onResizeStop={commitGridLayout}
            >
              {liveWidgets.map((widget) => {
                const plugin = pluginsById.get(widget.pluginId);
                return (
                  <Box key={widget.widgetId} sx={{ minWidth: 0, minHeight: 0 }}>
                    <AgentCard
                      agent={agentForWidget(widget)}
                      plugin={plugin}
                      widgetSize={widget}
                      editMode={editMode}
                      onRemove={() => removeWidget(widget.widgetId)}
                    />
                  </Box>
                );
              })}
            </ResponsiveGridLayout>
          ) : (
            <Box
              sx={{
                minHeight: 260,
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                placeItems: 'center',
                gap: 1.25,
                border: `1px solid ${theme.dashboard.palette.border}`,
                borderRadius: `${theme.dashboard.radius.md}px`,
                bgcolor: alpha(theme.dashboard.palette.elevated, 0.28),
                color: 'text.secondary',
                fontFamily: theme.dashboard.fontMono,
                fontSize: 13,
              }}
            >
              <Box sx={{ display: 'grid', gap: 1.25, justifyItems: 'center' }}>
                <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 13 }}>
                  No widgets on dashboard
                </Typography>
                {canEditLayout && (
                  <Button
                    variant="contained"
                    startIcon={<AddOutlinedIcon />}
                    onClick={openAddWidget}
                  >
                    Add widget
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>
        {editMode && canEditLayout && (
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
                onClick={resetLayout}
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
                onClick={openAddWidget}
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
        )}
      </Box>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeApi={themeApi}
        themeState={themeState}
        refreshThemes={refreshThemes}
      />
      <AddWidgetDialog
        open={addWidgetOpen}
        plugins={agentConfig.plugins}
        onClose={() => setAddWidgetOpen(false)}
        onAdd={addWidget}
      />
    </Box>
  );
}
