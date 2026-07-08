import { mockSnapshot } from './mockAgents.ts';
import type { DashboardSettings, PluginMeta, Settings, Snapshot } from '../../shared/types.ts';

// Mock data is a design-time convenience only (`npm run dev:web` with no
// server). In production builds the dashboard never invents agents — if the
// backend is unreachable it shows an empty/disconnected state instead.
const ALLOW_MOCKS = import.meta.env.DEV;

export const emptySnapshot: Snapshot = { updatedAt: null, agents: [], processes: null };

export function initialSnapshot(): Snapshot {
  return ALLOW_MOCKS ? mockSnapshot : emptySnapshot;
}

/**
 * Subscribe to live dashboard snapshots.
 * `onSnapshot(snapshot)` fires with the initial fetch and every SSE update.
 * `onConnection(connected: boolean)` (optional) tracks backend reachability
 * so the UI can show a truthful connection indicator.
 * Returns an unsubscribe function.
 */
export function subscribeSnapshot(
  onSnapshot: (snapshot: Snapshot) => void,
  onConnection?: (connected: boolean) => void,
): () => void {
  let closed = false;
  let source: EventSource | undefined;
  let receivedLiveSnapshot = false;
  const setConnected = (value: boolean) => {
    if (!closed) onConnection?.(value);
  };

  fetch('/api/status')
    .then((res) => (res.ok ? res.json() : null))
    .then((snapshot) => {
      if (!closed && Array.isArray(snapshot?.agents)) {
        receivedLiveSnapshot = true;
        setConnected(true);
        onSnapshot(snapshot);
      }
    })
    .catch(() => {
      if (!closed && !receivedLiveSnapshot) {
        setConnected(false);
        if (ALLOW_MOCKS) onSnapshot(mockSnapshot);
      }
    });

  try {
    source = new EventSource('/api/stream');
    source.onopen = () => setConnected(true);
    source.addEventListener('snapshot', (event) => {
      const snapshot = JSON.parse(event.data);
      if (Array.isArray(snapshot?.agents)) {
        receivedLiveSnapshot = true;
        setConnected(true);
        onSnapshot(snapshot);
      }
    });
    source.onerror = () => {
      setConnected(false);
      if (!closed && !receivedLiveSnapshot && ALLOW_MOCKS) onSnapshot(mockSnapshot);
    };
  } catch {
    setConnected(false);
    if (ALLOW_MOCKS) onSnapshot(mockSnapshot);
  }

  return () => {
    closed = true;
    source?.close();
  };
}

export async function loadAgentConfig(): Promise<{ plugins: PluginMeta[]; settings: Settings }> {
  const [configRes, settingsRes] = await Promise.all([
    fetch('/api/config'),
    fetch('/api/settings'),
  ]);
  if (!configRes.ok) throw new Error('Failed to load agent config.');
  if (!settingsRes.ok) throw new Error('Failed to load agent settings.');
  const config = await configRes.json();
  const settings = await settingsRes.json();
  return {
    plugins: config.plugins || [],
    settings,
  };
}

export async function saveDashboardSettings(dashboard: DashboardSettings): Promise<Settings> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save dashboard layout.');
  }
  return res.json();
}
