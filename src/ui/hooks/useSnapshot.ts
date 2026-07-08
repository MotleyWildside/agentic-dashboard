import React from 'react';
import { initialSnapshot, subscribeSnapshot } from '../../data/api.ts';
import type { Snapshot } from '../../../shared/types.ts';

/** Live snapshot from the server (fetch + SSE) plus connection health. */
export function useSnapshot() {
  const [snapshot, setSnapshot] = React.useState<Snapshot>(initialSnapshot);
  const [connected, setConnected] = React.useState(true);

  React.useEffect(() => subscribeSnapshot(setSnapshot, setConnected), []);

  return { snapshot, setSnapshot, connected };
}
