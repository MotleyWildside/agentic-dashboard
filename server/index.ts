import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config, publicConfig } from './config.ts';
import { collectProcesses, processMatchers } from './collectors/processes.ts';
import { applyManualOverrides } from './collectors/manual.ts';
import { plugins, pluginMeta } from './plugins/registry.ts';
import { errorAgentState, pruneInactiveSessions } from './lib/state.ts';
import { collectWidgetData } from './lib/collect.ts';
import { validateDashboard, normalizeDashboard } from './lib/dashboard.ts';
import {
  loadSettings, saveSettings, isEnabled,
  loadDismissed, saveDismissed,
} from './lib/store.ts';
import type { DashboardEvent, Snapshot } from '../shared/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From source: server/ → ../public. From compiled output: dist-server/server/ → ../../public.
const PUBLIC_DIR = await (async () => {
  for (const candidate of [path.join(__dirname, '..', 'public'), path.join(__dirname, '..', '..', 'public')]) {
    try {
      await fs.access(path.join(candidate, 'index.html'));
      return candidate;
    } catch { /* keep looking */ }
  }
  return path.join(__dirname, '..', 'public');
})();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// --- State ---
let snapshot: Snapshot = { updatedAt: null, agents: [], processes: null, widgetData: null };
const events: DashboardEvent[] = []; // ring buffer of dashboard events (status changes etc.)
const MAX_EVENTS = 100;
const sseClients = new Set<ServerResponse>();

let settings = loadSettings();
let dismissed = loadDismissed(); // "<agentId>:<sessionId>" -> ISO date dismissed
const dismissedSet = new Set(Object.keys(dismissed));

function pushEvent(agentId: string, text: string): void {
  const ev: DashboardEvent = { at: new Date().toISOString(), agent: agentId, text };
  events.push(ev);
  if (events.length > MAX_EVENTS) events.shift();
  broadcast('event', ev);
}

function broadcast(type: string, data: unknown): void {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

// --- Poll loop ---
let polling = false;
async function poll(): Promise<void> {
  if (polling) return; // never overlap
  polling = true;
  try {
    const enabledPlugins = plugins.filter((p) => isEnabled(settings, p.id));
    const makeCtx = (id: string) => ({
      isDismissed: (sid: string | null | undefined) => sid != null && dismissedSet.has(`${id}:${sid}`),
    });
    const agentPlugins = enabledPlugins.filter((p) => typeof p.collect === 'function');
    const [collected, processes, widgetData] = await Promise.all([
      Promise.all(
        agentPlugins.map((p) =>
          p
            .collect!(makeCtx(p.id))
            .catch((err) => errorAgentState(p.id, p.name, p.icon, err))
        )
      ),
      collectProcesses(processMatchers(plugins)).catch(() => null),
      collectWidgetData(enabledPlugins, makeCtx),
    ]);

    // Process signal upgrades "unknown" to "idle" when a process is alive.
    if (processes) {
      for (const a of collected) {
        if (a.status === 'unknown' && processes[a.id]?.running) {
          a.status = 'idle';
          a.sources.status = 'inferred';
          a.lastEvent = a.lastEvent || 'process detected';
        }
      }
    }

    const retentionMs = config.sessionRetentionS * 1000;
    const pruned = collected.map((agent) => pruneInactiveSessions(agent, retentionMs));
    const agents = applyManualOverrides(pruned);

    // Emit feed events on meaningful per-session changes.
    for (const next of agents) {
      const prev = snapshot.agents.find((a) => a.id === next.id);
      if (!prev) continue;
      const prevSessions = new Map((prev.sessions || []).map((s) => [s.sessionId, s]));
      for (const s of next.sessions || []) {
        const ps = prevSessions.get(s.sessionId);
        const tag = s.projectName ? `${s.projectName}: ` : '';
        if (!ps) {
          pushEvent(next.id, `${tag}session started`);
          continue;
        }
        if (ps.status !== s.status) pushEvent(next.id, `${tag}status: ${ps.status} → ${s.status}`);
        if (s.lastEvent && ps.lastEvent !== s.lastEvent) pushEvent(next.id, `${tag}${s.lastEvent}`);
      }
      if (!(next.sessions || []).length && prev.status !== next.status) {
        pushEvent(next.id, `status: ${prev.status} → ${next.status}`);
      }
    }

    snapshot = { updatedAt: new Date().toISOString(), agents, processes, widgetData };
    broadcast('snapshot', snapshot);
  } finally {
    polling = false;
  }
}

function effectiveSettings() {
  const merged: { plugins: Record<string, { enabled: boolean }>; dashboard: { widgets: unknown[] } } = {
    plugins: {},
    dashboard: {
      widgets: Array.isArray(settings.dashboard?.widgets) ? settings.dashboard.widgets : [],
    },
  };
  for (const p of plugins) {
    merged.plugins[p.id] = { enabled: isEnabled(settings, p.id) };
  }
  return merged;
}

// --- HTTP ---
async function readJsonBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function json(res: ServerResponse, code: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://localhost:' + config.port,
  });
  res.end(text);
}

async function serveStatic(res: ServerResponse, urlPath: string): Promise<void> {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const p = url.pathname;

  if (p === '/api/status') return json(res, 200, snapshot);
  if (p === '/api/agents') return json(res, 200, snapshot.agents);
  if (p === '/api/config') return json(res, 200, { ...publicConfig(), plugins: pluginMeta() });
  if (p === '/api/events') return json(res, 200, events);

  if (p === '/api/settings' && req.method === 'GET') {
    return json(res, 200, effectiveSettings());
  }

  if (p === '/api/settings' && req.method === 'POST') {
    let body: any;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { error: 'invalid JSON body' });
    }
    const knownIds = new Set(plugins.map((pl) => pl.id));
    if (body?.plugins !== undefined) {
      if (!body.plugins || typeof body.plugins !== 'object') {
        return json(res, 400, { error: 'plugins must be an object' });
      }
      for (const id of Object.keys(body.plugins)) {
        if (!knownIds.has(id)) return json(res, 400, { error: `unknown plugin id "${id}"` });
      }
      settings.plugins = { ...settings.plugins, ...body.plugins };
    }
    if (body?.dashboard !== undefined) {
      const error = validateDashboard(body.dashboard, knownIds);
      if (error) return json(res, 400, { error });
      settings.dashboard = {
        ...settings.dashboard,
        ...normalizeDashboard(body.dashboard, pluginMeta()),
      };
    }
    if (body?.plugins === undefined && body?.dashboard === undefined) {
      return json(res, 400, { error: 'expected { plugins } and/or { dashboard }' });
    }
    saveSettings(settings);
    // Drop agents that no longer have widgets from the live snapshot immediately.
    const nowEnabled = new Set(plugins.filter((pl) => isEnabled(settings, pl.id)).map((pl) => pl.id));
    snapshot = { ...snapshot, agents: snapshot.agents.filter((a) => nowEnabled.has(a.id)) };
    broadcast('snapshot', snapshot);
    poll();
    return json(res, 200, effectiveSettings());
  }

  if (p === '/api/dismiss' && req.method === 'POST') {
    let body: any;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { error: 'invalid JSON body' });
    }
    const { agentId, sessionId } = body || {};
    if (!agentId || !sessionId) {
      return json(res, 400, { error: 'expected { agentId, sessionId }' });
    }
    if (!plugins.some((pl) => pl.id === agentId)) {
      return json(res, 400, { error: `unknown plugin id "${agentId}"` });
    }
    const key = `${agentId}:${sessionId}`;
    dismissed[key] = new Date().toISOString();
    dismissedSet.add(key);
    dismissed = saveDismissed(dismissed);
    // Filter the session out of the live snapshot immediately.
    const agent = snapshot.agents.find((a) => a.id === agentId);
    if (agent) agent.sessions = (agent.sessions || []).filter((s) => s.sessionId !== sessionId);
    broadcast('snapshot', snapshot);
    poll();
    return json(res, 200, { ok: true });
  }

  if (p === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  return serveStatic(res, p);
});

const heartbeat = setInterval(() => {
  for (const res of sseClients) res.write(': keepalive\n\n');
}, 25_000);
heartbeat.unref();

await poll();
const pollTimer = setInterval(poll, config.pollMs);

// --- Graceful shutdown ---
// SSE clients hold long-lived connections, so a plain server.close() waits for
// them forever and the port never frees — which makes `node --watch` restarts
// (and Ctrl+C) collide with EADDRINUSE. Tear the sockets down explicitly so the
// port is released immediately.
let shuttingDown = false;
function shutdown(signal?: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(pollTimer);
  clearInterval(heartbeat);
  for (const res of sseClients) { try { res.end(); } catch { /* already gone */ } }
  sseClients.clear();
  server.closeAllConnections?.(); // Node ≥18.2: kill keep-alive sockets too
  server.close(() => process.exit(0));
  // Backstop: if something still lingers, don't hang the terminal.
  setTimeout(() => process.exit(0), 800).unref();
  if (signal) console.log(`\n${signal} → shutting down, port ${config.port} released.`);
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => shutdown(sig));

// Best-effort: kill whatever else is holding our port before we bind. Opt-in via
// FREE_PORT=1 (the `dev` script sets it) so stray/zombie instances don't win the
// port. macOS/Linux only (uses lsof); a no-op elsewhere.
function freePort(port: number): boolean {
  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }).trim();
    const pids = out.split('\n').map((s) => Number(s)).filter((n) => n && n !== process.pid);
    for (const pid of pids) {
      try { process.kill(pid, 'SIGTERM'); console.log(`Freed port ${port}: killed PID ${pid}`); } catch { /* gone */ }
    }
    return pids.length > 0;
  } catch {
    return false; // lsof missing or nothing on the port
  }
}

export interface ServerInfo {
  host: string;
  port: number;
  url: string;
}

// Resolves once the HTTP server is accepting connections. Consumers (e.g. the
// Electron shell) await this before pointing a window at the dashboard.
export const ready: Promise<ServerInfo> = new Promise((resolve, reject) => {
  let retried = false;
  function onListening(): void {
    console.log(`Agentic Dashboard → http://${config.host}:${config.port}`);
    console.log(`Polling every ${config.pollMs}ms | Claude: ${config.claudeProjectsDir} | Codex: ${config.codexSessionsDir}`);
    resolve({ host: config.host, port: config.port, url: `http://${config.host}:${config.port}` });
  }
  function onError(err: NodeJS.ErrnoException): void {
    // If the port is taken and we're allowed to free it, kill the holder and
    // retry once. Otherwise surface the error (the Electron shell attaches to
    // the existing instance on EADDRINUSE).
    if (err.code === 'EADDRINUSE' && process.env.FREE_PORT === '1' && !retried) {
      retried = true;
      if (freePort(config.port)) {
        setTimeout(() => server.listen(config.port, config.host), 250);
        return;
      }
    }
    reject(err);
  }
  server.on('error', onError);
  server.listen(config.port, config.host, onListening);
});
