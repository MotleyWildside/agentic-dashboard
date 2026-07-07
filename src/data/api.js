import { mockSnapshot } from './mockAgents.js';

export function subscribeSnapshot(onSnapshot) {
  let closed = false;
  let source;
  let receivedLiveSnapshot = false;

  fetch('/api/status')
    .then((res) => (res.ok ? res.json() : null))
    .then((snapshot) => {
      if (!closed && Array.isArray(snapshot?.agents)) {
        receivedLiveSnapshot = true;
        onSnapshot(snapshot);
      }
    })
    .catch(() => {
      if (!closed && !receivedLiveSnapshot) onSnapshot(mockSnapshot);
    });

  try {
    source = new EventSource('/api/stream');
    source.addEventListener('snapshot', (event) => {
      const snapshot = JSON.parse(event.data);
      if (Array.isArray(snapshot?.agents)) {
        receivedLiveSnapshot = true;
        onSnapshot(snapshot);
      }
    });
    source.onerror = () => {
      if (!closed && !receivedLiveSnapshot) onSnapshot(mockSnapshot);
    };
  } catch {
    onSnapshot(mockSnapshot);
  }

  return () => {
    closed = true;
    source?.close();
  };
}

export async function loadAgentConfig() {
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

export async function saveAgentPluginSettings(plugins) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plugins }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save agent settings.');
  }
  return res.json();
}

export async function saveDashboardSettings(dashboard) {
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
