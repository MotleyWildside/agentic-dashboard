import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import type { PluginLayout, WidgetInstance } from '../../../shared/types.ts';
import type { PluginInfo } from '../types.ts';

/** Pure widget-grid geometry — no React, unit-tested in test/ui-layout.test.ts.
 * Mirrors the server-side clamping in server/lib/dashboard.ts: the client
 * normalizes optimistically, the server's reply stays authoritative. */

export const GRID_COLS = { lg: 12, md: 12, sm: 6, xs: 1, xxs: 1 };
export const GRID_BREAKPOINTS = { lg: 1200, md: 900, sm: 640, xs: 360, xxs: 0 };
export const DEFAULT_WIDGET_LAYOUT: PluginLayout = { minW: 2, minH: 2, defaultW: 6, defaultH: 5, maxW: 8, maxH: 40 };

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeWidget(widget: WidgetInstance, plugin: PluginInfo | undefined): WidgetInstance {
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

export function makeWidgetId(pluginId: string): string {
  return `${pluginId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type Rect = Pick<WidgetInstance, 'x' | 'y' | 'w' | 'h'>;

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function findOpenPosition(widgets: WidgetInstance[], size: { w: number; h: number }, cols = 12): { x: number; y: number } {
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

export function widgetsToLayout(widgets: WidgetInstance[], pluginsById: Map<string, PluginInfo>): LayoutItem[] {
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

export function isValidLayoutItem(item: LayoutItem | null | undefined): item is LayoutItem {
  return Boolean(item && typeof item.i === 'string'
    && Number.isFinite(item.x)
    && Number.isFinite(item.y)
    && Number.isFinite(item.w)
    && Number.isFinite(item.h));
}

/** Responsive layout variants: lg/md keep the stored geometry, narrower
 * breakpoints reflow into fixed 2-column / 1-column stacks. */
export function buildResponsiveLayouts(widgets: WidgetInstance[], pluginsById: Map<string, PluginInfo>): Record<string, LayoutItem[]> {
  const lg = widgetsToLayout(widgets, pluginsById);
  const sm = widgets.map((widget, index) => ({ i: widget.widgetId, x: index % 2 ? 3 : 0, y: Math.floor(index / 2) * 4, w: 3, h: Math.max(3, Math.min(5, widget.h)) }));
  const single = widgets.map((widget, index) => ({ i: widget.widgetId, x: 0, y: index * 4, w: 1, h: Math.max(3, Math.min(5, widget.h)) }));
  return { lg, md: lg, sm, xs: single, xxs: single };
}

export function isValidLayout(layout: Layout): boolean {
  return Array.isArray(layout) && layout.every(isValidLayoutItem);
}
