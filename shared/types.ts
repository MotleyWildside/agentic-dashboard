/**
 * Shared domain types — the normalized data contract between the server
 * (plugins/collectors), the HTTP API, and the React frontend.
 *
 * This is the single place the "agent state" shape is defined. If you change
 * anything here, update docs/knowledge-base/wiki/agents/normalized-agent-data.md
 * and server/plugins/_template.ts in the same change.
 */

/** Ordered by urgency — see STATUS_PRIORITY in server/lib/state.ts. */
export type AgentStatus =
  | 'failed'
  | 'blocked'
  | 'needs_input'
  | 'waiting_approval'
  | 'running'
  | 'idle'
  | 'unknown';

/** Provenance label for every displayed field; absent = unavailable. */
export type SourceLabel = 'real' | 'inferred' | 'manual';

export interface TokenUsage {
  input: number | null;
  output: number | null;
  total: number | null;
  /** Context window size in tokens (may be inferred — see sources). */
  limit: number | null;
}

export interface RateLimits {
  /** ~5h window used %, if the agent reports it. */
  shortWindowPercent: number | null;
  /** ~7d window used %, if the agent reports it. */
  longWindowPercent: number | null;
  resetAt: string | null;
  planType?: string | null;
  resetsIn?: string | null;
}

/** A question the agent is blocked on (e.g. Claude Code AskUserQuestion). */
export interface PendingInput {
  tool: string;
  questions: Array<{
    question: string;
    header: string | null;
    options: string[];
  }>;
}

export interface AgentSession {
  sessionId: string | null;
  threadId?: string | null;
  parentThreadId?: string | null;
  /** 'user' for top-level sessions, 'subagent' for spawned sub-threads. */
  threadSource?: string | null;
  agentNickname?: string | null;
  agentRole?: string | null;
  cwd: string | null;
  projectName: string | null;
  model: string | null;
  effort?: string | { level?: string; type?: string; name?: string } | null;
  status: AgentStatus;
  contextUsedPercent: number | null;
  /** Tokens currently occupying the context window, when known exactly. */
  contextTokens?: number | null;
  tokens: TokenUsage;
  costUsd: number | null;
  lastEvent: string | null;
  lastActivityAt: string | null;
  needsApproval: boolean;
  pendingInput?: PendingInput | null;
  rateLimits?: RateLimits | null;
}

/**
 * Normalized per-agent state — what collect() returns and what the UI renders.
 * Agent-level summary fields mirror the newest session; status is the most
 * urgent across sessions. Build instances with emptyAgentState() from
 * server/lib/state.ts; never invent values — leave them null.
 */
export interface AgentState {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  sessions: AgentSession[];
  model: string | null;
  cwd: string | null;
  projectName: string | null;
  sessionId: string | null;
  effort: AgentSession['effort'];
  contextUsedPercent: number | null;
  tokens: TokenUsage;
  costUsd: number | null;
  rateLimits: RateLimits | null;
  lastActivityAt: string | null;
  lastEvent: string | null;
  needsApproval: boolean;
  error: string | null;
  /** field name -> provenance; a field absent here is 'unavailable'. */
  sources: Record<string, SourceLabel>;
  setupHint: string | null;
  planType?: string | null;
}

export interface ProcessInfo {
  running: boolean;
  pids: number[];
}

/** The full dashboard snapshot served by GET /api/status and SSE. */
export interface Snapshot {
  updatedAt: string | null;
  agents: AgentState[];
  processes: Record<string, ProcessInfo> | null;
}

export interface DashboardEvent {
  at: string;
  agent: string;
  text: string;
}

/** One widget placed on the dashboard grid (grid units, 12 columns). */
export interface WidgetInstance {
  widgetId: string;
  pluginId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardSettings {
  widgets: WidgetInstance[];
}

/** Persisted shape of ~/.agent-dashboard/settings.json. */
export interface Settings {
  /** Legacy — written by old clients, no longer read (enablement is widget-derived). */
  plugins: Record<string, { enabled?: boolean }>;
  dashboard: DashboardSettings;
}

/** Widget sizing defaults/limits in grid units. */
export interface PluginLayout {
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
  maxW: number;
  maxH: number;
}

/** What GET /api/config exposes per plugin (no collector internals). */
export interface PluginMeta {
  id: string;
  name: string;
  icon: string;
  logo: string | null;
  layout: PluginLayout;
}

export interface CollectContext {
  /** True if the user hid this session from the dashboard. */
  isDismissed: (sessionId: string | null | undefined) => boolean;
}

/**
 * The agent plugin contract — see server/plugins/_template.ts for field docs
 * and docs/knowledge-base/wiki/agents/agent-provider-contract.md.
 */
export interface AgentPlugin {
  id: string;
  name: string;
  icon: string;
  logo?: string;
  layout?: Partial<PluginLayout>;
  matchProcess?: (cmd: string) => boolean;
  collect: (ctx: CollectContext) => Promise<AgentState>;
}

// --- Themes ---

export interface ThemePack {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  version?: string;
  author?: string;
  source?: 'built-in' | 'custom';
  palette: {
    background: { default: string; paper: string; elevated: string };
    text: { primary: string; secondary: string; muted: string; dim?: string };
    accent: string;
    border: string;
    divider?: string;
  };
  status: {
    running: string;
    idle: string;
    waiting: string;
    attention: string;
    error: string;
  };
  typography: {
    fontUi: string;
    fontMono: string;
    headingWeight: number;
    bodyWeight: number;
  };
  radius: { sm: number; md: number; lg: number; xl: number };
  spacing: { density: string; base: number };
  effects: {
    shadowStrength: 'none' | 'subtle' | 'medium' | 'strong';
    glowStrength: 'none' | 'subtle' | 'medium' | 'strong';
    glassBlur: number;
    backgroundNoise: boolean;
  };
  components: {
    card: { borderWidth: number; surfaceOpacity: number };
    badge: { variant: string; uppercase: boolean };
  };
  progress: { height: number; radius: number };
  agent?: { activeRail: boolean; promptMarker: string };
  appChrome?: { background: string; trafficLights: boolean };
}

export interface ThemeListItem {
  theme: ThemePack;
  source: 'built-in' | 'custom';
}

/** Theme persistence API — implemented twice: Electron IPC (window.agentThemes
 * via electron/preload.cjs) and browser localStorage (src/main.tsx). */
export interface ThemeApi {
  list(): Promise<{ themes: ThemeListItem[]; selectedThemeId: string }>;
  setSelected(themeId: string): Promise<{ ok: boolean; error?: string }>;
  importTheme(jsonText: string): Promise<{ ok: boolean; errors?: string[]; theme?: ThemePack }>;
  deleteCustom(themeId: string): Promise<{ ok: boolean; error?: string }>;
  reset(): Promise<{ ok: boolean }>;
  exportTheme(themeId: string): Promise<{ ok: boolean; jsonText?: string; error?: string }>;
}
