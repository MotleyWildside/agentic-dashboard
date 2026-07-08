import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentPlugin, ProcessInfo } from '../../shared/types.ts';

const execFileP = promisify(execFile);

export interface ProcessMatcher {
  id: string;
  match: (cmd: string) => boolean;
}

/**
 * Process collector — supplementary signal only.
 * Scans `ps` output against each plugin's optional `matchProcess(cmd)`
 * predicate (see plugins/_template.ts). Used to distinguish "agent installed
 * & running but idle" from "agent not present" when the log collectors find
 * nothing fresh. Never invents token/cost data.
 *
 * A matcher that throws is treated as no-match so one broken plugin cannot
 * take down the poll loop.
 */
export async function collectProcesses(matchers: ProcessMatcher[]): Promise<Record<string, ProcessInfo>> {
  const result: Record<string, ProcessInfo> = {};
  for (const { id } of matchers) result[id] = { running: false, pids: [] };
  if (!matchers.length) return result;

  let stdout = '';
  try {
    ({ stdout } = await execFileP('ps', ['-axo', 'pid=,command='], { maxBuffer: 8 * 1024 * 1024 }));
  } catch {
    return result;
  }
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(.*)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const cmd = m[2];
    for (const { id, match } of matchers) {
      let hit = false;
      try {
        hit = match(cmd);
      } catch {
        /* broken matcher — ignore */
      }
      if (hit) {
        result[id].running = true;
        result[id].pids.push(pid);
      }
    }
  }
  return result;
}

/** Extract [{ id, match }] from the plugin list (plugins without matchProcess are skipped). */
export function processMatchers(plugins: AgentPlugin[]): ProcessMatcher[] {
  return plugins
    .filter((p) => typeof p.matchProcess === 'function')
    .map((p) => ({ id: p.id, match: p.matchProcess! }));
}
