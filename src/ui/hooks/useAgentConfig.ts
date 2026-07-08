import React from 'react';
import { initialSnapshot, loadAgentConfig } from '../../data/api.ts';
import type { AgentState, ProcessInfo, Settings, Snapshot } from '../../../shared/types.ts';
import type { PluginInfo } from '../types.ts';

export interface AgentConfigState {
  plugins: PluginInfo[];
  settings: Partial<Settings>;
  snapshotAgents: AgentState[];
  snapshotProcesses: Record<string, ProcessInfo>;
}

/** Plugin metadata + persisted dashboard settings from the server, with a
 * mock-derived plugin fallback when the backend is unreachable. */
export function useAgentConfig(snapshot: Snapshot) {
  const [agentConfig, setAgentConfig] = React.useState<AgentConfigState>(() => ({
    plugins: [],
    settings: { plugins: {} },
    snapshotAgents: initialSnapshot().agents,
    snapshotProcesses: {},
  }));

  const refreshAgentConfig = React.useCallback(async () => {
    try {
      const result = await loadAgentConfig();
      setAgentConfig((current) => ({ ...current, ...result }));
    } catch {
      setAgentConfig((current) => ({
        ...current,
        plugins: current.plugins.length
          ? current.plugins
          : initialSnapshot().agents.map((agent) => ({ id: agent.id, name: agent.name, icon: agent.icon })),
      }));
    }
  }, []);

  React.useEffect(() => {
    refreshAgentConfig();
  }, [refreshAgentConfig]);

  React.useEffect(() => {
    setAgentConfig((current) => ({
      ...current,
      snapshotAgents: snapshot.agents || [],
      snapshotProcesses: snapshot.processes || {},
    }));
  }, [snapshot]);

  return { agentConfig, setAgentConfig, refreshAgentConfig };
}
