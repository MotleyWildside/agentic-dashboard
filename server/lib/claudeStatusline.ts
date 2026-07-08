import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.ts';

const REPORTER_NAME = 'claude-statusline-reporter.js';
const WRAPPER_NAME = 'claude-statusline-wrapper.sh';
const WRAPPER_CONFIG_NAME = 'claude-statusline-wrapper.json';

export type ClaudeStatuslineInstallStatus =
  | 'installed'
  | 'already-configured'
  | 'updated-existing-reporter'
  | 'wrapped-existing-statusline'
  | 'already-wrapped'
  | 'settings-invalid'
  | 'reporter-missing'
  | 'failed';

export interface ClaudeStatuslineInstallResult {
  status: ClaudeStatuslineInstallStatus;
  settingsPath: string;
  reporterPath: string;
  wrapperPath: string;
  wrapperConfigPath: string;
  command: string;
  wrapperCommand: string;
  error?: string;
}

interface EnsureClaudeStatuslineOptions {
  homeDir?: string;
  agentDashboardDir?: string;
  reporterSourcePath?: string;
  wrapperSourcePath?: string;
  nodeCommand?: string;
  dryRun?: boolean;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function commandFor(nodeCommand: string, reporterPath: string): string {
  return `${nodeCommand} ${shellQuote(reporterPath)}`;
}

function shellCommandFor(scriptPath: string): string {
  return `/bin/sh ${shellQuote(scriptPath)}`;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

function readSettings(settingsPath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (err: any) {
    if (err?.code === 'ENOENT') return {};
    return null;
  }
}

function resolveScriptSource(name: string, envVar: string): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env[envVar] || '',
    // TS source: server/lib/ -> scripts/
    path.join(here, '..', '..', 'scripts', name),
    // Compiled server: dist-server/server/lib/ -> repo scripts/
    path.join(here, '..', '..', '..', 'scripts', name),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function copyExecutable(sourcePath: string, targetPath: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const source = fs.readFileSync(sourcePath);
  let current: Buffer | null = null;
  try {
    current = fs.readFileSync(targetPath);
  } catch {
    current = null;
  }
  if (!current || !current.equals(source)) fs.writeFileSync(targetPath, source);
  fs.chmodSync(targetPath, 0o755);
}

/**
 * Best-effort Claude Code setup. Installs Mimiron's reporter when there is no
 * statusLine yet, updates old Mimiron reporter paths, and wraps custom
 * statuslines so their output remains visible while Mimiron captures the same
 * JSON payload.
 */
export function ensureClaudeStatusline(
  opts: EnsureClaudeStatuslineOptions = {}
): ClaudeStatuslineInstallResult {
  const homeDir = opts.homeDir || os.homedir();
  const agentDashboardDir = opts.agentDashboardDir || config.agentDashboardDir;
  const settingsPath = path.join(homeDir, '.claude', 'settings.json');
  const reporterPath = path.join(agentDashboardDir, REPORTER_NAME);
  const wrapperPath = path.join(agentDashboardDir, WRAPPER_NAME);
  const wrapperConfigPath = path.join(agentDashboardDir, WRAPPER_CONFIG_NAME);
  const command = commandFor(opts.nodeCommand || 'node', reporterPath);
  const wrapperCommand = shellCommandFor(wrapperPath);
  const resultBase = { settingsPath, reporterPath, wrapperPath, wrapperConfigPath, command, wrapperCommand };

  try {
    const sourcePath = opts.reporterSourcePath || resolveScriptSource(REPORTER_NAME, 'CLAUDE_STATUSLINE_REPORTER_SOURCE');
    const wrapperSourcePath = opts.wrapperSourcePath || resolveScriptSource(WRAPPER_NAME, 'CLAUDE_STATUSLINE_WRAPPER_SOURCE');
    if (!sourcePath || !wrapperSourcePath) return { status: 'reporter-missing', ...resultBase };
    if (!opts.dryRun) {
      copyExecutable(sourcePath, reporterPath);
      copyExecutable(wrapperSourcePath, wrapperPath);
    }

    const settings = readSettings(settingsPath);
    if (!settings) return { status: 'settings-invalid', ...resultBase };

    const existing = settings.statusLine;
    const existingCommand = typeof existing?.command === 'string' ? existing.command : null;
    if (existingCommand === command) {
      return { status: 'already-configured', ...resultBase };
    }
    if (existingCommand === wrapperCommand) {
      return { status: 'already-wrapped', ...resultBase };
    }

    if (!existing) {
      settings.statusLine = { type: 'command', command: wrapperCommand };
      if (!opts.dryRun) writeJsonAtomic(settingsPath, settings);
      return { status: 'installed', ...resultBase };
    }

    if (existingCommand?.includes(REPORTER_NAME)) {
      settings.statusLine = { ...existing, type: 'command', command: wrapperCommand };
      if (!opts.dryRun) writeJsonAtomic(settingsPath, settings);
      return { status: 'updated-existing-reporter', ...resultBase };
    }

    if (existingCommand) {
      if (!opts.dryRun) writeJsonAtomic(wrapperConfigPath, { nextCommand: existingCommand });
      settings.statusLine = { ...existing, type: 'command', command: wrapperCommand };
      if (!opts.dryRun) writeJsonAtomic(settingsPath, settings);
      return { status: 'wrapped-existing-statusline', ...resultBase };
    }

    return { status: 'settings-invalid', ...resultBase };
  } catch (err) {
    return {
      status: 'failed',
      ...resultBase,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
