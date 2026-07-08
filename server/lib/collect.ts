import type { AgentPlugin, CollectContext } from '../../shared/types.ts';

/**
 * Run collectData() for every plugin that defines one, returning a
 * pluginId -> payload map for Snapshot.widgetData (custom widget types).
 *
 * Failure isolation mirrors the agent path: a rejected collectData() becomes a
 * `null` payload (logged) and never aborts the poll or the other plugins. The
 * payload is opaque — core does not interpret it; the plugin's own renderer
 * does. Returns `null` (not `{}`) when no plugin has custom-widget data, so the
 * snapshot stays identical to today for pure agent-card dashboards. See ADR-0006.
 */
export async function collectWidgetData(
  plugins: AgentPlugin[],
  makeCtx: (pluginId: string) => CollectContext,
): Promise<Record<string, unknown> | null> {
  const withData = plugins.filter((p) => typeof p.collectData === 'function');
  if (!withData.length) return null;
  const entries = await Promise.all(
    withData.map(async (p) => {
      try {
        return [p.id, await p.collectData!(makeCtx(p.id))] as const;
      } catch (err) {
        console.warn(`[plugins] ${p.id}.collectData failed:`, (err as any)?.message || err);
        return [p.id, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
