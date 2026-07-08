import React from 'react';
import { Alert, Box, Button, Typography, alpha, useTheme } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import { AgentCard } from '../agent-card/AgentCard.tsx';
import { useCompact } from '../hooks/useCompact.ts';
import { GRID_BREAKPOINTS, GRID_COLS } from './layout.ts';
import type { AgentState, WidgetInstance } from '../../../shared/types.ts';
import type { CardAgent, PluginInfo } from '../types.ts';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardGridProps {
  widgets: WidgetInstance[];
  layouts: Record<string, LayoutItem[]>;
  pluginsById: Map<string, PluginInfo>;
  agentsById: Map<string, AgentState>;
  editMode: boolean;
  canEditLayout: boolean;
  layoutError: string;
  onPreviewLayout: (layout: Layout) => void;
  onCommitLayout: (layout: Layout) => void;
  onRemoveWidget: (widgetId: string) => void;
  onOpenAddWidget: () => void;
}

/** The widget grid: react-grid-layout wiring, drag/resize chrome, and the
 * empty state. Placeholder agents fill in for widgets without snapshot data. */
export function DashboardGrid({
  widgets,
  layouts,
  pluginsById,
  agentsById,
  editMode,
  canEditLayout,
  layoutError,
  onPreviewLayout,
  onCommitLayout,
  onRemoveWidget,
  onOpenAddWidget,
}: DashboardGridProps) {
  const theme = useTheme();
  const compact = useCompact();

  function agentForWidget(widget: WidgetInstance): CardAgent {
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
      {widgets.length ? (
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
          onDrag={onPreviewLayout}
          onDragStop={onCommitLayout}
          onResize={onPreviewLayout}
          onResizeStop={onCommitLayout}
        >
          {widgets.map((widget) => {
            const plugin = pluginsById.get(widget.pluginId);
            return (
              <Box key={widget.widgetId} sx={{ minWidth: 0, minHeight: 0 }}>
                <AgentCard
                  agent={agentForWidget(widget)}
                  plugin={plugin}
                  widgetSize={widget}
                  editMode={editMode}
                  onRemove={() => onRemoveWidget(widget.widgetId)}
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
                onClick={onOpenAddWidget}
              >
                Add widget
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
