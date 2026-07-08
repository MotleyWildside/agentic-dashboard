#!/usr/bin/env node
/**
 * Architecture linter — machine-checks the boundary rules documented in
 * docs/knowledge-base/wiki/architecture/module-map.md (`npm run lint:arch`).
 *
 * Inspired by "harness engineering": architectural intent that only lives in
 * prose drifts; encoding it as lint rules keeps every future change (human or
 * AI) inside the boundaries. If you legitimately need to break a rule, change
 * the rule HERE and in the module map + an ADR — in the same change.
 *
 * Rules:
 *   R1  shared/ is dependency-free (only relative imports within shared/).
 *   R2  src/ never imports server code; server/ never imports src code.
 *   R3  collectors don't import plugins, the registry, or server/index.ts.
 *   R4  plugin files don't import other plugins, the registry, or server/index.ts.
 *   R5  no agent-specific plugin ids ('claude'/'codex') in core code
 *       (server/index.ts, server/lib/, src/ui/, src/main.tsx, src/theme/).
 *   R6  no hardcoded hex colors in UI components (theme tokens only).
 *   R7  server/lib/ modules don't import from plugins/ or collectors/.
 *
 * Zero dependencies; exits 1 with findings on any violation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors: string[] = [];
const rel = (p: string) => path.relative(ROOT, p);

function walk(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/** All static import/export-from specifiers in a source file. */
function importsOf(file: string): string[] {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function resolvesInto(file: string, spec: string, targetDir: string): boolean {
  if (!spec.startsWith('.')) return false;
  const resolved = path.normalize(path.join(path.dirname(file), spec));
  return resolved.startsWith(path.join(ROOT, targetDir));
}

// --- R1: shared/ is dependency-free ---
for (const file of walk(path.join(ROOT, 'shared'), ['.ts'])) {
  for (const spec of importsOf(file)) {
    const ok = spec.startsWith('./') && !spec.includes('..');
    if (!ok) errors.push(`R1 ${rel(file)}: shared/ must be dependency-free, imports "${spec}"`);
  }
}

// --- R2: src ↔ server isolation ---
for (const file of walk(path.join(ROOT, 'src'), ['.ts', '.tsx'])) {
  for (const spec of importsOf(file)) {
    if (resolvesInto(file, spec, 'server')) {
      errors.push(`R2 ${rel(file)}: frontend must not import server code ("${spec}") — talk over the API + shared/types.ts`);
    }
  }
}
for (const file of walk(path.join(ROOT, 'server'), ['.ts'])) {
  for (const spec of importsOf(file)) {
    if (resolvesInto(file, spec, 'src')) {
      errors.push(`R2 ${rel(file)}: server must not import frontend code ("${spec}")`);
    }
  }
}

// --- R3/R4/R7: intra-server layering ---
const layerRules: Array<{ dir: string; forbidden: string[]; rule: string; why: string }> = [
  { dir: 'server/collectors', forbidden: ['server/plugins', 'server/index.ts'], rule: 'R3', why: 'collectors are leaves' },
  { dir: 'server/lib', forbidden: ['server/plugins', 'server/collectors', 'server/index.ts'], rule: 'R7', why: 'lib is agent-agnostic core' },
];
for (const { dir, forbidden, rule, why } of layerRules) {
  for (const file of walk(path.join(ROOT, dir), ['.ts'])) {
    for (const spec of importsOf(file)) {
      for (const target of forbidden) {
        const isDir = !target.endsWith('.ts');
        const hit = isDir
          ? resolvesInto(file, spec, target)
          : spec.startsWith('.') && path.normalize(path.join(path.dirname(file), spec)) === path.join(ROOT, target);
        if (hit) errors.push(`${rule} ${rel(file)}: must not import ${target} (${why}); imports "${spec}"`);
      }
    }
  }
}
for (const file of walk(path.join(ROOT, 'server', 'plugins'), ['.ts'])) {
  const base = path.basename(file);
  if (base.startsWith('registry.')) continue;
  for (const spec of importsOf(file)) {
    const resolved = spec.startsWith('.') ? path.normalize(path.join(path.dirname(file), spec)) : '';
    if (resolved.startsWith(path.join(ROOT, 'server', 'plugins')) || resolved === path.join(ROOT, 'server', 'index.ts')) {
      errors.push(`R4 ${rel(file)}: plugins must not import other plugins/registry/index; imports "${spec}"`);
    }
  }
}

// --- R5: no plugin-id literals in core code ---
// Agent knowledge belongs in server/plugins/ + server/collectors/ (and mocks/tests/config).
const CORE_PATHS = [
  'server/index.ts',
  ...walk(path.join(ROOT, 'server', 'lib'), ['.ts']),
  ...walk(path.join(ROOT, 'src', 'ui'), ['.ts', '.tsx']),
  path.join(ROOT, 'src', 'main.tsx'),
  ...walk(path.join(ROOT, 'src', 'theme'), ['.ts', '.tsx']),
].map((p) => (path.isAbsolute(p) ? p : path.join(ROOT, p)));
const PLUGIN_ID_RE = /['"](claude|codex)['"]/;
for (const file of CORE_PATHS) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
    const m = line.match(PLUGIN_ID_RE);
    if (m) errors.push(`R5 ${rel(file)}:${i + 1}: agent id literal '${m[1]}' in core code — move agent knowledge into its plugin/collector`);
  });
}

// --- R6: no hardcoded hex colors in UI components ---
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
for (const file of [...walk(path.join(ROOT, 'src', 'ui'), ['.ts', '.tsx']), path.join(ROOT, 'src', 'main.tsx')]) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
    const m = line.match(HEX_RE);
    if (m) errors.push(`R6 ${rel(file)}:${i + 1}: hardcoded color ${m[0]} — use theme tokens (theme.dashboard.* / theme.palette.*)`);
  });
}

if (errors.length) {
  console.error(`✖ arch lint: ${errors.length} violation(s)\n`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nBoundary rules: docs/knowledge-base/wiki/architecture/module-map.md');
  console.error('To change a rule: edit this linter + the module map + add an ADR, in one change.');
  process.exit(1);
}
console.log('✔ arch lint: all boundary rules hold');
