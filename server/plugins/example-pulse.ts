import { collectPulse } from '../collectors/example-pulse.ts';
import type { AgentPlugin } from '../../shared/types.ts';

/**
 * Reference custom-widget plugin (ADR-0006). It is NOT an agent card: it sets
 * `widgetType: 'pulse'` and provides `collectData` (not `collect`), so the poll
 * loop routes its payload into Snapshot.widgetData and the frontend draws it
 * with the 'pulse' renderer (src/ui/widgets/PulseWidget.tsx).
 *
 * Like every plugin it is inert until a user adds its widget (enablement is
 * widget-derived). It exists as the copy-me example for non-agent widgets.
 */
const plugin: AgentPlugin = {
  id: 'pulse',
  name: 'Dashboard Pulse',
  icon: '◉',
  widgetType: 'pulse',
  layout: { minW: 2, minH: 2, defaultW: 3, defaultH: 3, maxW: 6, maxH: 8 },
  collectData: collectPulse,
};

export default plugin;
