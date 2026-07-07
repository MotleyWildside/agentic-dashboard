import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';

/**
 * Read the last `maxBytes` of a file and return parsed JSONL objects, in file order.
 * A partial first line (from cutting mid-file) is dropped automatically.
 */
export async function tailJsonl(filePath, maxBytes = 256 * 1024) {
  const stat = await fs.stat(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const fh = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(Math.min(maxBytes, stat.size));
    await fh.read(buf, 0, buf.length, start);
    let text = buf.toString('utf8');
    if (start > 0) {
      const nl = text.indexOf('\n');
      text = nl >= 0 ? text.slice(nl + 1) : '';
    }
    const out = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        /* partial or corrupt line — skip */
      }
    }
    return out;
  } finally {
    await fh.close();
  }
}

/** Read and parse the first line of a JSONL file (session metadata usually lives there). */
export async function headJsonl(filePath, maxBytes = 512 * 1024) {
  const fh = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buf, 0, maxBytes, 0);
    const text = buf.toString('utf8', 0, bytesRead);
    const nl = text.indexOf('\n');
    if (nl < 0) return null;
    try {
      return JSON.parse(text.slice(0, nl));
    } catch {
      return null;
    }
  } finally {
    await fh.close();
  }
}

/** Newest file (by mtime) matching a predicate, searched across a list of directories. */
export async function newestFile(dirs, predicate) {
  let best = null;
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!predicate(name)) continue;
      const full = path.join(dir, name);
      let stat;
      try {
        stat = await fs.stat(full);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = { path: full, mtimeMs: stat.mtimeMs, size: stat.size };
      }
    }
  }
  return best;
}

/** Read a JSON file, returning null on any error. Optionally require freshness (mtime). */
export function readJsonSync(filePath, maxAgeMs = null) {
  try {
    if (maxAgeMs != null) {
      const stat = fss.statSync(filePath);
      if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
    }
    return JSON.parse(fss.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function ageSeconds(mtimeMs) {
  return (Date.now() - mtimeMs) / 1000;
}
