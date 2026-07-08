import { GRID_ROW_PX } from '../dashboard/layout.ts';

/** Pure card-density logic — no React, unit-tested in test/ui-density.test.ts.
 * Decides how much content an AgentCard shows for a given widget size. */

export interface CardSize {
  w: number;
  h: number;
}

export interface CardDensity {
  /** Narrow or short widgets: compact header, dense session rows. */
  small: boolean;
  /** Mid-height widgets: full rows but compact limits footer. */
  medium: boolean;
  /** How many session rows to render (Infinity = no cap, container scrolls). */
  visibleSessionCount: number;
}

/** Approximate vertical chrome of a small card: header + metric chips + limits + paddings. */
const SMALL_CARD_CHROME_PX = 170;
/** Approximate height of one dense TaskRow including grid gap. */
const DENSE_ROW_PX = 104;

/** Small cards used to hide sessions entirely; now they show as many dense
 * rows as the widget height fits (0 on truly tiny widgets). Larger cards
 * show every row and rely on scrolling. */
export function cardDensity(size: CardSize, sessionRowCount: number): CardDensity {
  const small = size.w <= 3 || size.h <= 2;
  const medium = !small && size.h <= 4;
  if (!small) return { small, medium, visibleSessionCount: sessionRowCount };
  const available = size.h * GRID_ROW_PX - SMALL_CARD_CHROME_PX;
  const fit = Math.max(0, Math.floor(available / DENSE_ROW_PX));
  return { small, medium, visibleSessionCount: Math.min(sessionRowCount, fit) };
}
