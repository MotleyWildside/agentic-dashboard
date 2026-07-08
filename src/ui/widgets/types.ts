import type { CardAgent, PluginInfo } from '../types.ts';

/**
 * Props every widget renderer receives (ADR-0006). A renderer uses whichever
 * it needs: the agent card reads `agent`; a custom widget reads `data`
 * (its plugin's Snapshot.widgetData payload, opaque to the core).
 */
export interface WidgetRendererProps {
  plugin: PluginInfo | undefined;
  /** Live/placeholder agent state — meaningful for the 'agent-card' renderer. */
  agent: CardAgent;
  /** This plugin's custom-widget payload (Snapshot.widgetData[pluginId]). */
  data: unknown;
  widgetSize: { w: number; h: number };
  editMode: boolean;
  onRemove?: () => void;
}
