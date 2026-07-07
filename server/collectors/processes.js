import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/**
 * Process collector — supplementary signal only.
 * Detects running Claude Code / Codex processes via `ps`. Used to distinguish
 * "agent installed & running but idle" from "agent not present" when the log
 * collectors find nothing fresh. Never invents token/cost data.
 */
export async function collectProcesses() {
  const result = { claude: { running: false, pids: [] }, codex: { running: false, pids: [] } };
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
    // Claude Code CLI binary (native binary or npm dist), not this dashboard.
    if (/(^|\/)claude( |$)/.test(cmd) || /claude-code.*\/cli\.js/.test(cmd)) {
      result.claude.running = true;
      result.claude.pids.push(pid);
    }
    // Codex CLI / Desktop app-server. Exclude updater/helper noise.
    if ((/(^|\/)codex( |$)/.test(cmd) || /codex app-server/.test(cmd)) && !/Sparkle|Updater/.test(cmd)) {
      result.codex.running = true;
      result.codex.pids.push(pid);
    }
  }
  return result;
}
