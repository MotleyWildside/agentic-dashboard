import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { TopBar } from './TopBar.tsx';
import { AddWidgetDialog } from './dashboard/AddWidgetDialog.tsx';
import { DashboardGrid } from './dashboard/DashboardGrid.tsx';
import { EditControls } from './dashboard/EditControls.tsx';
import { useDashboard } from './dashboard/useDashboard.ts';
import { useAgentConfig } from './hooks/useAgentConfig.ts';
import { useCanEditLayout } from './hooks/useCompact.ts';
import { useSnapshot } from './hooks/useSnapshot.ts';
import { SettingsDialog } from './settings/SettingsDialog.tsx';
import type { AgentState, ThemeApi } from '../../shared/types.ts';
import type { PluginInfo, ThemeState } from './types.ts';

export type { ThemeState } from './types.ts';

export interface AppProps {
  themeApi: ThemeApi;
  themeState: ThemeState;
  refreshThemes: () => Promise<void>;
}

/** Composition root: wires snapshot + config state into the dashboard grid
 * and the chrome (top bar, dialogs). All feature logic lives in the
 * dashboard/, agent-card/, settings/ modules and the hooks/ directory. */
export default function App({ themeApi, themeState, refreshThemes }: AppProps) {
  const theme = useTheme();
  const canEditLayout = useCanEditLayout();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = React.useState(false);

  const { snapshot, setSnapshot, connected } = useSnapshot();
  const { agentConfig, setAgentConfig, refreshAgentConfig } = useAgentConfig(snapshot);
  const dashboard = useDashboard({ agentConfig, setAgentConfig, refreshAgentConfig, setSnapshot, editMode });

  const visibleAgents = Array.isArray(snapshot.agents) ? snapshot.agents : [];
  const agentsById = React.useMemo(
    () => new Map(visibleAgents.map((agent): [string, AgentState] => [agent.id, agent])),
    [visibleAgents],
  );

  React.useEffect(() => {
    if (!canEditLayout && editMode) setEditMode(false);
  }, [canEditLayout, editMode]);

  function openAddWidget() {
    if (canEditLayout) setEditMode(true);
    setAddWidgetOpen(true);
  }

  function addWidget(plugin: PluginInfo) {
    setAddWidgetOpen(false);
    dashboard.addWidget(plugin);
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
        connected={connected}
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
        <DashboardGrid
          widgets={dashboard.liveWidgets}
          layouts={dashboard.layouts}
          pluginsById={dashboard.pluginsById}
          agentsById={agentsById}
          editMode={editMode}
          canEditLayout={canEditLayout}
          layoutError={dashboard.layoutError}
          onPreviewLayout={dashboard.previewGridLayout}
          onCommitLayout={dashboard.commitGridLayout}
          onRemoveWidget={dashboard.removeWidget}
          onOpenAddWidget={openAddWidget}
        />
        {editMode && canEditLayout && (
          <EditControls onAddWidget={openAddWidget} onResetLayout={dashboard.resetLayout} />
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
