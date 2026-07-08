/**
 * Pure renderer-key resolution for the widget registry (ADR-0006). Kept free
 * of React/JSX imports so it is unit-testable under `node --test` (which strips
 * types but cannot run JSX). registry.tsx wires these keys to components.
 */

/** The standard agent card — used when a plugin declares no widgetType. */
export const DEFAULT_WIDGET_TYPE = 'agent-card';

/** Honest fallback when a plugin asks for a renderer the bundle doesn't have. */
export const UNKNOWN_WIDGET_TYPE = 'unknown';

/**
 * Resolve which renderer key to use for a plugin's widgetType:
 *  - undefined/empty → the default agent card;
 *  - a registered type → that type;
 *  - an unregistered type → 'unknown' (never throws, never renders a blank).
 * The returned key is always present in a registry that registers
 * DEFAULT_WIDGET_TYPE and UNKNOWN_WIDGET_TYPE.
 */
export function resolveWidgetType(
  widgetType: string | null | undefined,
  registered: Iterable<string>,
): string {
  const type = widgetType || DEFAULT_WIDGET_TYPE;
  const set = registered instanceof Set ? registered : new Set(registered);
  return set.has(type) ? type : UNKNOWN_WIDGET_TYPE;
}
