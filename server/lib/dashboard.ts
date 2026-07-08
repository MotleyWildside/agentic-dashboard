import type { DashboardSettings, PluginMeta } from '../../shared/types.ts';

/**
 * Dashboard layout validation & normalization — pure functions, no I/O.
 * The HTTP layer (server/index.ts) calls these on POST /api/settings so a
 * malformed payload can never land in settings.json. Widget geometry is
 * clamped against each plugin's declared layout limits (see registry.ts).
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns an error string, or null if the payload is valid.
 * `knownPluginIds` is a Set of registered plugin ids.
 */
export function validateDashboard(dashboard: any, knownPluginIds: Set<string>): string | null {
  if (!dashboard || typeof dashboard !== 'object' || !Array.isArray(dashboard.widgets)) {
    return 'expected { dashboard: { widgets: [...] } }';
  }
  const seenWidgetIds = new Set<string>();
  for (const widget of dashboard.widgets) {
    if (!widget || typeof widget !== 'object') return 'dashboard.widgets must contain objects';
    if (!widget.widgetId || typeof widget.widgetId !== 'string') return 'widget.widgetId is required';
    if (seenWidgetIds.has(widget.widgetId)) return `duplicate widgetId "${widget.widgetId}"`;
    seenWidgetIds.add(widget.widgetId);
    if (!knownPluginIds.has(widget.pluginId)) return `unknown plugin id "${widget.pluginId}"`;
    for (const key of ['x', 'y', 'w', 'h'] as const) {
      if (!Number.isFinite(widget[key])) return `widget.${key} must be a number`;
    }
  }
  return null;
}

/**
 * Round and clamp widget geometry to each plugin's layout limits.
 * `pluginMetaList` is the array returned by registry pluginMeta().
 */
export function normalizeDashboard(
  dashboard: DashboardSettings,
  pluginMetaList: PluginMeta[]
): DashboardSettings {
  const pluginById = new Map(pluginMetaList.map((plugin) => [plugin.id, plugin]));
  return {
    ...dashboard,
    widgets: dashboard.widgets.map((widget) => {
      const layout: Partial<PluginMeta['layout']> = pluginById.get(widget.pluginId)?.layout || {};
      const minW = Number.isFinite(layout.minW) ? layout.minW! : 1;
      const minH = Number.isFinite(layout.minH) ? layout.minH! : 1;
      const maxW = Number.isFinite(layout.maxW) ? layout.maxW! : 12;
      const maxH = Number.isFinite(layout.maxH) ? layout.maxH! : 12;
      return {
        ...widget,
        x: Math.max(0, Math.round(widget.x)),
        y: Math.max(0, Math.round(widget.y)),
        w: clamp(Math.round(widget.w), minW, maxW),
        h: clamp(Math.round(widget.h), minH, maxH),
      };
    }),
  };
}
