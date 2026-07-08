import React from 'react';
import { AgentCard } from '../agent-card/AgentCard.tsx';
import type { WidgetRendererProps } from './types.ts';

/**
 * Adapter that maps the generic WidgetRendererProps onto the existing
 * AgentCard — the built-in 'agent-card' renderer (ADR-0006). AgentCard owns its
 * own card frame, so this does not use WidgetShell.
 */
export function AgentCardWidget({ plugin, agent, widgetSize, editMode, onRemove }: WidgetRendererProps) {
  return <AgentCard agent={agent} plugin={plugin} widgetSize={widgetSize} editMode={editMode} onRemove={onRemove} />;
}
