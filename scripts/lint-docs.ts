#!/usr/bin/env node
/**
 * Documentation linter — keeps the knowledge base honest (`npm run lint:docs`).
 *
 * Machine-checks what docs/knowledge-base/schema.md's "wiki health check"
 * prescribes, so stale docs fail fast instead of rotting:
 *   1. Relative Markdown links resolve to existing files.
 *   2. [[wikilinks]] resolve to an existing knowledge-base page.
 *   3. No orphan wiki pages — every wiki page is referenced from wiki/index.md.
 *   4. Repo paths named in backticks actually exist (stale-reference check).
 *   5. Every ADR is listed in wiki/index.md.
 *
 * Zero dependencies; exits 1 with a findings list on any violation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KB = path.join(ROOT, 'docs', 'knowledge-base');
// Root-level docs also covered by link/path checks.
const EXTRA_DOCS = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'docs/agent-plugins.md'];

const errors: string[] = [];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const kbPages = walk(KB);
const allDocs = [...kbPages, ...EXTRA_DOCS.map((p) => path.join(ROOT, p)).filter((p) => fs.existsSync(p))];
const rel = (p: string) => path.relative(ROOT, p);

// --- 1. Relative Markdown links resolve ---
for (const page of allDocs) {
  const text = fs.readFileSync(page, 'utf8');
  for (const m of text.matchAll(/\]\(([^)#\s]+?\.(?:md|ts|tsx|cjs|json|js))(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:\/\//.test(target)) continue; // external URL
    const resolved = path.normalize(path.join(path.dirname(page), target));
    if (!fs.existsSync(resolved)) errors.push(`${rel(page)}: broken link → ${target}`);
  }
}

/** Strip fenced code blocks and inline code spans — examples aren't claims. */
function prose(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** Historical layers: raw/ notes and accepted ADRs legitimately name old paths. */
function isHistorical(page: string): boolean {
  return page.includes(`${path.sep}raw${path.sep}`) || page.includes(`${path.sep}decisions${path.sep}`);
}

// --- 2. [[wikilinks]] resolve to a KB page basename ---
const pageNames = new Set(kbPages.map((p) => path.basename(p, '.md')));
for (const page of kbPages) {
  const text = prose(fs.readFileSync(page, 'utf8'));
  for (const m of text.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)) {
    const name = m[1].trim();
    if (!pageNames.has(name)) errors.push(`${rel(page)}: unresolved wikilink [[${name}]]`);
  }
}

// --- 3. Orphan check: every wiki page referenced from wiki/index.md ---
const indexText = fs.readFileSync(path.join(KB, 'wiki', 'index.md'), 'utf8');
for (const page of kbPages) {
  if (!page.includes(`${path.sep}wiki${path.sep}`)) continue; // raw/ + top-level files are exempt
  const base = path.basename(page);
  if (base === 'index.md') continue;
  if (!indexText.includes(base)) errors.push(`wiki/index.md: orphan page not listed → ${rel(page)}`);
}

// --- 4. Backticked repo paths exist (stale-reference check) ---
// Escape hatch for deliberate hypothetical paths (worked examples):
//   <!-- lint-docs-allow: substring1 substring2 -->
const TOP_DIRS = ['server/', 'src/', 'shared/', 'electron/', 'scripts/', 'test/', 'themes/', 'public/', 'docs/'];
for (const page of allDocs) {
  if (isHistorical(page)) continue;
  const raw = fs.readFileSync(page, 'utf8');
  const allowed = [...raw.matchAll(/<!--\s*lint-docs-allow:([^>]*?)-->/g)].flatMap((m) => m[1].trim().split(/\s+/));
  const text = raw.replace(/```[\s\S]*?```/g, ''); // fenced examples aren't claims; inline code IS how paths are cited
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const ref = m[1];
    if (!TOP_DIRS.some((d) => ref.startsWith(d))) continue;
    if (allowed.some((a) => a && ref.includes(a))) continue;
    // Skip globs, placeholders, and prose-y refs — only literal paths are checked.
    if (/[*<>…{}|\\]|\s/.test(ref)) continue;
    const target = ref.split('#')[0].replace(/[.,;:]$/, '');
    if (!fs.existsSync(path.join(ROOT, target))) {
      errors.push(`${rel(page)}: references missing path \`${target}\``);
    }
  }
}

// --- 5. Every ADR listed in wiki/index.md ---
const adrDir = path.join(KB, 'wiki', 'decisions');
for (const adr of fs.readdirSync(adrDir).filter((f) => f.startsWith('ADR-') && f.endsWith('.md'))) {
  if (!indexText.includes(adr)) errors.push(`wiki/index.md: ADR not listed → decisions/${adr}`);
}

if (errors.length) {
  console.error(`✖ docs lint: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nFix the docs (or the code they describe) — rules: docs/knowledge-base/schema.md');
  process.exit(1);
}
console.log(`✔ docs lint: ${allDocs.length} documents clean`);
