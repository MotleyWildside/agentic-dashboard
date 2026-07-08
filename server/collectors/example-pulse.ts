import type { CollectContext } from '../../shared/types.ts';

/** Opaque payload shape for the 'pulse' custom widget (its renderer owns this). */
export interface PulseData {
  /** ISO time of the first poll after the dashboard started. */
  startedAt: string;
  /** ISO time of this poll. */
  polledAt: string;
  /** How many times collectData has run — a real liveness counter, not invented. */
  ticks: number;
}

let startedAt: string | null = null;
let ticks = 0;

/**
 * Reference custom-widget collector (ADR-0006). NOT an agent: it reports the
 * dashboard's own poll heartbeat — real data about this process, with no agent
 * specifics, no filesystem, and no network. Copy this + example-pulse.ts as the
 * starting point for a non-agent widget.
 */
export async function collectPulse(_ctx: CollectContext): Promise<PulseData> {
  const now = new Date().toISOString();
  if (startedAt === null) startedAt = now;
  ticks += 1;
  return { startedAt, polledAt: now, ticks };
}
