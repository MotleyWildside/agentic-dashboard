import type { ComponentType } from 'react';
import { AgentCardWidget } from './AgentCardWidget.tsx';
import { PulseWidget } from './PulseWidget.tsx';
import { UnknownWidget } from './UnknownWidget.tsx';
import { DEFAULT_WIDGET_TYPE, UNKNOWN_WIDGET_TYPE, resolveWidgetType } from './resolve.ts';
import type { WidgetRendererProps } from './types.ts';

export type WidgetRenderer = ComponentType<WidgetRendererProps>;

/**
 * Frontend widget renderer registry (ADR-0006): widgetType → component. This is
 * the client-side mirror of the server plugin registry. To add a widget kind,
 * register its renderer here — no core changes. Bundled at build time (Vite
 * compiles src/ into public/), so a new renderer ships with a rebuild, not a
 * runtime drop-in — consistent with the review-to-install security model.
 */
const registry: Record<string, WidgetRenderer> = {
  [DEFAULT_WIDGET_TYPE]: AgentCardWidget,
  pulse: PulseWidget,
  [UNKNOWN_WIDGET_TYPE]: UnknownWidget,
};

/** Component for a plugin's widgetType; falls back to UnknownWidget. */
export function getWidgetRenderer(widgetType: string | null | undefined): WidgetRenderer {
  return registry[resolveWidgetType(widgetType, Object.keys(registry))];
}
