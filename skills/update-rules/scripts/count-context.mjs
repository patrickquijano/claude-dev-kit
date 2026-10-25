// Context size for update-rules: non-blank line counts of the always-loaded memory files and the tracked-file match count of each rule `paths` glob.
// Read-only. CLI: `count-context.mjs <project-dir>`, JSON on stdout.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Runs `fn` only when this module is the entry script; an error it throws prints one stderr line and sets exit code 1.
async function runIfMain(metaUrl, fn, label) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = 1;
  }
}

const MAX_HOPS = 4;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

export const countNonBlank = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '').length;

// `paths` globs from the YAML frontmatter: a block list, an inline `[a, b]` list, or one scalar; empty when absent.
export function parsePaths(text) {
  const fm = FRONTMATTER.exec(String(text ?? ''));
  if (!fm) return [];
  const lines = fm[1].split(/\r?\n/);
  const at = lines.findIndex((l) => /^paths\s*:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].replace(/^paths\s*:/, '').trim();
  if (inline)
    return inline
      .replace(/^\[|\]$/g, '')
      .split(/,(?![^{]*\})/)
      .map(unquote)
      .filter(Boolean);
  const globs = [];
  for (const l of lines.slice(at + 1)) {
    const item = /^\s+-\s+(.*)$/.exec(l);
    if (!item) {
      if (l.trim() === '' || /^\s+#/.test(l)) continue;
      break;
    }
    globs.push(unquote(item[1]));
  }
  return globs.filter(Boolean);
}

// Relative `@path` imports outside code fences and code spans; home (`~`) and absolute paths are skipped.
export function findImports(text) {
  const found = [];
  let fence = null;
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const f = /^\s*(```+|~~~+)/.exec(raw);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    for (const m of raw.replace(/`[^`]*`/g, '').matchAll(/(?:^|\s)@(\S+)/g)) {
      const p = m[1].replace(/[.,;:)]+$/, '');
      if (p && !p.startsWith('~') && !path.isAbsolute(p)) found.push(p);
    }
  }
  return found;
}

// Glob match on a posix path: `**/` spans zero or more directories, `**` anything, `*` and `?` stay in one segment, `{a,b}` alternates.
export function matchesGlob(file, glob) {
  let re = '';
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') {
      depth++;
      re += '(?:';
    } else if (c === '}' && depth) {
      depth--;
      re += ')';
    } else if (c === ',' && depth) re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  // eslint-disable-next-line security/detect-non-literal-regexp -- every regex metacharacter in the glob is escaped above
  return depth === 0 && new RegExp(`^${re}$`).test(file);
}

const inside = (root, target) => {
  const rel = path.relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

// Side effects; tests pass stubs, everything else uses the real ones.
const realDeps = {
  existsSync,
  readFileSync,
  readdirSync,
  trackedFiles: (root) =>
    execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', timeout: 30000 })
      .split('\0')
      .filter(Boolean),
  matchesGlob,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// Counts for one project root: always-loaded files (project, then ancestors) and each path-scoped rule's glob matches.
export function countContext(root, deps = {}) {
  const d = { ...realDeps, ...deps };
  const read = (file) => d.readFileSync(file, 'utf8');
  const project = [];
  const queue = [];
  const seen = new Set();
  const add = (file, hop) => {
    if (seen.has(file)) return;
    seen.add(file);
    project.push({ path: path.relative(root, file).split(path.sep).join('/'), lines: countNonBlank(read(file)) });
    queue.push({ file, hop });
  };
  for (const rel of ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md']) {
    const file = path.join(root, rel);
    if (d.existsSync(file)) add(file, 0);
  }
  const rulesDir = path.join(root, '.claude', 'rules');
  const scoped = [];
  if (d.existsSync(rulesDir)) {
    const names = d
      .readdirSync(rulesDir, { recursive: true })
      .map((n) => String(n).split(path.sep).join('/'))
      .filter((n) => n.endsWith('.md'))
      .sort();
    for (const name of names) {
      const file = path.join(rulesDir, name);
      const globs = parsePaths(read(file));
      if (globs.length) scoped.push({ file: `.claude/rules/${name}`, globs });
      else add(file, 0);
    }
  }
  while (queue.length) {
    const { file, hop } = queue.shift();
    if (hop >= MAX_HOPS) continue;
    for (const imp of findImports(read(file))) {
      const target = path.resolve(path.dirname(file), imp);
      if (inside(root, target) && d.existsSync(target)) add(target, hop + 1);
    }
  }
  const ancestors = [];
  for (let dir = path.dirname(root); ; dir = path.dirname(dir)) {
    const file = path.join(dir, 'CLAUDE.md');
    if (d.existsSync(file)) ancestors.push({ path: file, lines: countNonBlank(read(file)) });
    if (path.dirname(dir) === dir) break;
  }
  const tracked = scoped.length ? d.trackedFiles(root) : [];
  const rules = scoped.map(({ file, globs }) => ({
    file,
    globs: globs.map((glob) => ({ glob, matches: tracked.filter((f) => d.matchesGlob(f, glob)).length }))
  }));
  const sum = (list) => list.reduce((n, f) => n + f.lines, 0);
  return {
    root,
    project,
    ancestors,
    alwaysLoaded: `${sum(project)} + ${sum(ancestors)}`,
    rules
  };
}

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 1) {
    d.error('usage: count-context.mjs <project-dir>');
    return 2;
  }
  const root = path.resolve(argv[0]);
  if (!d.existsSync(root)) {
    d.error(`count-context: ${root} does not exist`);
    return 1;
  }
  d.log(JSON.stringify(countContext(root, d)));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'count-context');
