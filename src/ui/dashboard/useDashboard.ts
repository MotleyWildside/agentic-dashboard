import React from 'react';
import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import { saveDashboardSettings } from '../../data/api.ts';
import type { Snapshot, WidgetInstance } from '../../../shared/types.ts';
import type { AgentConfigState } from '../hooks/useAgentConfig.ts';
import type { PluginInfo } from '../types.ts';
import {
  DEFAULT_WIDGET_LAYOUT,
  buildResponsiveLayouts,
  findOpenPosition,
  isValidLayout,
  isValidLayoutItem,
  makeWidgetId,
  normalizeWidget,
} from './layout.ts';

interface UseDashboardArgs {
  agentConfig: AgentConfigState;
  setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfigState>>;
  refreshAgentConfig: () => Promise<void>;
  setSnapshot: React.Dispatch<React.SetStateAction<Snapshot>>;
  editMode: boolean;
}

/** Widget-grid state: persisted widgets from settings, drag-preview layout,
 * and the optimistic save cycle (local update → POST → adopt server reply,
 * or revert by re-fetching on error). */
export function useDashboard({ agentConfig, setAgentConfig, refreshAgentConfig, setSnapshot, editMode }: UseDashboardArgs) {
  const [layoutError, setLayoutError] = React.useState('');
  const [liveLayout, setLiveLayout] = React.useState<Layout | null>(null);

  const pluginsById = React.useMemo(
    () => new Map(agentConfig.plugins.map((plugin): [string, PluginInfo] => [plugin.id, plugin])),
    [agentConfig.plugins],
  );

  const dashboardWidgets = React.useMemo(() => {
    const widgets = agentConfig.settings?.dashboard?.widgets || [];
    return widgets
      .filter((widget) => widget?.widgetId && widget?.pluginId && pluginsById.has(widget.pluginId))
      .map((widget) => normalizeWidget(widget, pluginsById.get(widget.pluginId)));
  }, [agentConfig.settings, pluginsById]);

  const layouts = React.useMemo(
    () => buildResponsiveLayouts(dashboardWidgets, pluginsById),
    [dashboardWidgets, pluginsById],
  );

  const liveWidgets = React.useMemo(() => {
    if (!Array.isArray(liveLayout)) return dashboardWidgets;
    const layoutById = new Map(liveLayout.filter(isValidLayoutItem).map((item): [string, LayoutItem] => [item.i, item]));
    return dashboardWidgets.map((widget) => {
      const item = layoutById.get(widget.widgetId);
      return item
        ? normalizeWidget({ ...widget, x: item.x, y: item.y, w: item.w, h: item.h }, pluginsById.get(widget.pluginId))
        : widget;
    });
  }, [dashboardWidgets, liveLayout, pluginsById]);

  React.useEffect(() => {
    if (!editMode) setLiveLayout(null);
  }, [editMode]);

  React.useEffect(() => {
    setLiveLayout(null);
  }, [dashboardWidgets.length]);

  async function saveDashboard(widgets: WidgetInstance[]) {
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
      setLayoutError((err as Error)?.message || 'Failed to save dashboard layout.');
      await refreshAgentConfig();
    }
  }

  function applyGridLayout(layout: Layout) {
    if (!isValidLayout(layout)) {
      setLayoutError('Layout change was ignored because the grid returned invalid geometry.');
      return;
    }
    const layoutById = new Map(layout.map((item): [string, LayoutItem] => [item.i, item]));
    const nextWidgets = dashboardWidgets.map((widget) => {
      const item = layoutById.get(widget.widgetId);
      return item ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h } : widget;
    });
    saveDashboard(nextWidgets);
  }

  function previewGridLayout(layout: Layout) {
    if (isValidLayout(layout)) setLiveLayout(layout);
  }

  function commitGridLayout(layout: Layout) {
    setLiveLayout(null);
    applyGridLayout(layout);
  }

  function addWidget(plugin: PluginInfo) {
    const limits = { ...DEFAULT_WIDGET_LAYOUT, ...(plugin.layout || {}) };
    const size = { w: limits.defaultW, h: limits.defaultH };
    const position = findOpenPosition(dashboardWidgets, size, 12);
    saveDashboard([...dashboardWidgets, {
      widgetId: makeWidgetId(plugin.id),
      pluginId: plugin.id,
      x: position.x,
      y: position.y,
      w: size.w,
      h: size.h,
    }]);
  }

  function removeWidget(widgetId: string) {
    saveDashboard(dashboardWidgets.filter((widget) => widget.widgetId !== widgetId));
  }

  function resetLayout() {
    saveDashboard([]);
  }

  return {
    pluginsById,
    dashboardWidgets,
    layouts,
    liveWidgets,
    layoutError,
    previewGridLayout,
    commitGridLayout,
    addWidget,
    removeWidget,
    resetLayout,
  };
}
