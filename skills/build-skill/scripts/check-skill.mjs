// Mechanical checks for one skill directory (frontmatter, size, layout, links, standalone, injection, Output); prints JSON.
// Self-contained on purpose: plugin installs have no node_modules, and no skill may link another skill's files.
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Recursive file listing as POSIX paths relative to `dir`.
function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name.startsWith('.')) continue; // .DS_Store and other dotfiles are not skill files
    if (entry.isDirectory()) out.push(...listFiles(dir, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out.sort();
}

// Real side effects; tests pass stubs.
const defaults = {
  list: (dir) => listFiles(dir),
  read: (path) => readFileSync(path, 'utf8'),
  log: (line) => console.log(line),
  error: (line) => console.error(line)
};

const USAGE = 'usage: check-skill.mjs <skill-dir> [--kind task|reference|background-only] [--allow <plugin-path>]...';
const KINDS = ['task', 'reference', 'background-only'];
// Copied from the Fields table in references/frontmatter.md.
const KNOWN_FIELDS = new Set([
  'name',
  'description',
  'when_to_use',
  'argument-hint',
  'arguments',
  'allowed-tools',
  'disallowed-tools',
  'disable-model-invocation',
  'user-invocable',
  'context',
  'agent',
  'background',
  'model',
  'effort',
  'paths',
  'hooks',
  'shell',
  'license',
  'compatibility',
  'metadata'
]);
const ALLOWED_TOP = new Set(['SKILL.md', 'references', 'assets', 'scripts']);
const ACTOR_SUFFIX = /(er|or|ist|ant)$/;
const FENCE = /^\s*```/;

export class FrontmatterError extends Error {}

const error = (id, rubric, file, line, message) => ({ level: 'error', id, rubric, file, line, message });
const warning = (id, rubric, file, line, message) => ({ level: 'warning', id, rubric, file, line, message });

// Strips surrounding quotes from a scalar.
function unquote(value) {
  const v = value.trim();
  const quoted = v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0];
  return quoted ? v.slice(1, -1) : v;
}

// Parses the frontmatter subset check-skill needs: top-level `key: value`, quoted strings, `- item` block lists, and
// indented continuation lines. Returns the fields, each key's 1-based line, and the closing `---` line.
export function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trimEnd() !== '---') throw new FrontmatterError('missing opening --- on line 1');
  const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === '---');
  if (end === -1) throw new FrontmatterError('missing closing ---');
  const fields = {};
  const lineOf = {};
  let key = null;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    const top = /^([A-Za-z_][\w-]*):(.*)$/.exec(line);
    if (top) {
      key = top[1];
      lineOf[key] = i + 1;
      const raw = top[2].trim();
      const value = /^["']/.test(raw) ? raw : raw.replace(/\s+#.*$/, '');
      fields[key] = /^[>|][+-]?$/.test(value) ? '' : unquote(value);
    } else if (key && /^\s+-\s/.test(line)) {
      if (!Array.isArray(fields[key])) fields[key] = [];
      fields[key].push(unquote(line.replace(/^\s+-\s+/, '')));
    } else if (key && /^\s+\S/.test(line) && typeof fields[key] === 'string') {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    }
  }
  return { fields, lineOf, endLine: end + 1 };
}

const text = (value) => (Array.isArray(value) ? value.join(' ') : String(value ?? ''));

// F1, F3, F6, F8 on the parsed fields; `lineOf` maps a field to its line.
export function checkFrontmatter(fields, dirName, lineOf = {}) {
  const found = [];
  const at = (key) => lineOf[key] ?? 1;
  for (const key of Object.keys(fields)) {
    if (!KNOWN_FIELDS.has(key)) {
      found.push(error('unknown-field', 'F6', 'SKILL.md', at(key), `unknown frontmatter field "${key}"`));
    }
  }
  const name = text(fields.name);
  if (!name) {
    found.push(error('name-missing', 'F1', 'SKILL.md', 1, 'name is missing'));
  } else {
    const line = at('name');
    if (!name.split('-').every((part) => /^[a-z0-9]+$/.test(part))) {
      found.push(
        error(
          'name-format',
          'F1',
          'SKILL.md',
          line,
          `name "${name}" must be kebab-case a-z0-9 with no edge or double hyphens`
        )
      );
    }
    if (name.length > 64)
      found.push(error('name-length', 'F1', 'SKILL.md', line, `name is ${name.length} chars, max 64`));
    if (name !== dirName)
      found.push(error('name-dir', 'F1', 'SKILL.md', line, `name "${name}" must equal directory "${dirName}"`));
    if (/anthropic|claude/.test(name))
      found.push(error('name-reserved', 'F1', 'SKILL.md', line, 'name contains a reserved word'));
    const last = name.split('-').pop();
    if (ACTOR_SUFFIX.test(last)) {
      found.push(
        warning(
          'name-actor',
          'F8',
          'SKILL.md',
          line,
          `name ends in "${last}": name the action (verb-first), not the actor`
        )
      );
    }
  }
  const description = text(fields.description);
  const line = at('description');
  if (!description) {
    found.push(error('description-missing', 'F3', 'SKILL.md', 1, 'description is missing'));
  } else {
    if (description.length > 200)
      found.push(
        error('description-length', 'F3', 'SKILL.md', line, `description is ${description.length} chars, max 200`)
      );
    if (REFERENCE.test(description))
      found.push(
        error('description-reference', 'F3', 'SKILL.md', line, 'description names a skill, subagent, or spawner')
      );
    if (/<[a-zA-Z/][^>]*>/.test(description))
      found.push(error('description-xml', 'F3', 'SKILL.md', line, 'description contains an XML tag'));
  }
  const combined = description.length + text(fields.when_to_use).length;
  if (combined > 1536)
    found.push(
      error('listing-length', 'F3', 'SKILL.md', line, `description + when_to_use is ${combined} chars, max 1,536`)
    );
  return found;
}

// A plugin-qualified skill or agent name, or a spawned-by phrase; bare names stay a rubric judgment.
const REFERENCE = /\b[a-z0-9-]+:[a-z0-9]+-[a-z0-9-]+\b|\bspawned by\b/i;

// Removes double-backtick code spans, where a skill may quote the injection syntax in prose.
const stripSpans = (line) => line.replace(/``.+?``/g, '');

// Finds `!` injections from line index `from`: [{line, what}]. Only those without an `||` fallback unless `any`.
function bareInjections(lines, from, any = false) {
  const found = [];
  let fence = null;
  for (let i = from; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE.test(line)) {
      if (fence?.injection && (any || !fence.body.includes('||')))
        found.push({ line: fence.start, what: 'a ```! block' });
      fence = fence ? null : { start: i + 1, injection: /^\s*```!/.test(line), body: '' };
    } else if (fence) {
      fence.body += `${line}\n`;
    } else {
      const m = /(?:^|\s)!`([^`]+)`/.exec(stripSpans(line));
      if (m && (any || !m[1].includes('||'))) found.push({ line: i + 1, what: `injection "${m[1].slice(0, 40)}"` });
    }
  }
  return found;
}

// B1, B6, B9, Q1 on SKILL.md. opts: kind, hasBundled (bundled files exist), bodyStart (frontmatter lines to skip).
export function checkBody(content, { kind, hasBundled = false, bodyStart = 0 } = {}) {
  const lines = content.split('\n');
  const found = [];
  const total = content.endsWith('\n') ? lines.length - 1 : lines.length;
  if (total >= 500)
    found.push(error('skill-too-long', 'B1', 'SKILL.md', total, `SKILL.md has ${total} lines, limit is under 500`));

  for (const { line, what } of bareInjections(lines, bodyStart)) {
    found.push(error('injection-fallback', 'B6', 'SKILL.md', line, `${what} has no || fallback`));
  }

  if (hasBundled && !lines.slice(bodyStart).some((l) => /^##\s+(Files|Navigation)\b/i.test(l))) {
    found.push(
      error(
        'navigation-missing',
        'B9',
        'SKILL.md',
        1,
        'bundled files exist but SKILL.md has no "## Files" navigation section'
      )
    );
  }
  if (kind === 'task') {
    const start = lines.findIndex((l, i) => i >= bodyStart && /^##\s+Output\b/i.test(l));
    if (start === -1) {
      found.push(error('output-missing', 'Q1', 'SKILL.md', 1, 'Task skill has no "## Output" section'));
    } else {
      let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
      if (end === -1) end = lines.length;
      if (!lines.slice(start, end).some((l) => /^Result:/.test(l))) {
        found.push(error('output-result', 'Q1', 'SKILL.md', start + 1, 'Output has no "Result:" line'));
      }
    }
  }
  return found;
}

// L2: only SKILL.md, references/, assets/, scripts/ beside the skill.
export function checkLayout(files) {
  const found = [];
  if (!files.includes('SKILL.md')) found.push(error('skill-missing', 'L2', 'SKILL.md', 1, 'SKILL.md not found'));
  for (const file of files) {
    const top = file.split('/')[0];
    const nested = file.includes('/');
    if (!ALLOWED_TOP.has(top) || (!nested && top !== 'SKILL.md')) {
      found.push(error('layout', 'L2', file, 1, `"${file}" is outside SKILL.md, references/, assets/, scripts/`));
    }
  }
  return found;
}

// L3 and L2: each ${CLAUDE_SKILL_DIR}/ path must exist, and each bundled file must be linked from SKILL.md.
export function checkLinks(skillMd, files) {
  const found = [];
  const linked = new Set();
  const lines = skillMd.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s`)'"\]]+)/g)) {
      const target = m[1].replace(/[.,;:*]+$/, '');
      const clean = posix.normalize(target);
      if (clean.startsWith('..')) continue; // reported by checkStandalone
      const dir = clean.endsWith('/') ? clean : `${clean}/`;
      const hits = files.filter((f) => f === clean || f.startsWith(dir));
      if (hits.length === 0)
        found.push(error('link-broken', 'L3', 'SKILL.md', i + 1, `link "${target}" does not exist`));
      hits.forEach((f) => linked.add(f));
    }
  });
  for (const file of files) {
    if (file !== 'SKILL.md' && !linked.has(file)) {
      found.push(error('orphan', 'L2', file, 1, `"${file}" is never linked from SKILL.md`));
    }
  }
  return found;
}

const SCRIPT = /\.(mjs|js|cjs)$/;

// True when a plugin-relative path equals an allowed path or sits under an allowed directory (entry ending in "/").
function isAllowed(pluginPath, allow) {
  return allow.some((a) => pluginPath === a || (a.endsWith('/') && pluginPath.startsWith(a)));
}

// L3: nothing in the skill may reference a path outside its own directory (another skill, the plugin root, ../..), except paths in `allow`.
export function checkStandalone(files, dir, deps = defaults, allow = []) {
  const found = [];
  const skillName = basename(resolve(dir));
  const outside = (file, line, what) =>
    found.push(error('link-outside', 'L3', file, line, `${what} leaves the skill directory`));
  const leaves = (file, target) => {
    const joined = posix.join(posix.dirname(file), target);
    return joined.startsWith('..') && !isAllowed(posix.join('skills', skillName, joined), allow);
  };
  for (const file of files) {
    const isMd = file.endsWith('.md');
    const isScript = file.startsWith('scripts/') && SCRIPT.test(file);
    if (!isMd && !isScript) continue;
    const nested = file.startsWith('references/') || file.startsWith('assets/');
    deps
      .read(join(dir, file))
      .split('\n')
      .forEach((line, i) => {
        const at = i + 1;
        if (isScript) {
          for (const m of line.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.[^'"]*)['"]/g)) {
            if (leaves(file, m[1])) outside(file, at, `import "${m[1]}"`);
          }
          return;
        }
        for (const m of line.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s`)'"\]]+)/g)) {
          if (leaves('SKILL.md', m[1])) outside(file, at, `link "${m[1]}"`);
        }
        for (const m of line.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/(skills\/[^\s`)'"\]]*)/g)) {
          if (!isAllowed(posix.normalize(m[1].replace(/[.,;:*]+$/, '')), allow))
            outside(file, at, 'a ${CLAUDE_PLUGIN_ROOT}/skills/ path');
        }
        if (!nested) return;
        const targets = [...line.matchAll(/\]\(([^)\s#]+)/g)].map((m) => m[1]).filter((t) => !/^([a-z]+:|\/)/i.test(t));
        targets.push(...[...line.matchAll(/`(\.\.\/[^`\s]*)`/g)].map((m) => m[1]));
        for (const t of targets) if (leaves(file, t)) outside(file, at, `link "${t}"`);
      });
  }
  return found;
}

// B4 and B6 on references/: a long file opens with a contents list, and none carries a `!` injection.
export function checkReferences(files, dir, deps = defaults) {
  const found = [];
  for (const file of files.filter((f) => f.startsWith('references/') && f.endsWith('.md'))) {
    const lines = deps.read(join(dir, file)).split('\n');
    const total = lines.at(-1) === '' ? lines.length - 1 : lines.length;
    if (total > 100 && !lines.slice(0, 20).some((l) => /^##\s+Contents\b/i.test(l))) {
      found.push(error('contents-missing', 'B4', file, 1, `${total} lines but no "## Contents" list near the top`));
    }
    for (const { line } of bareInjections(lines, 0, true)) {
      found.push(error('injection-in-reference', 'B6', file, line, '! injection inside references/ is not applied'));
    }
  }
  return found;
}

// Runs every check on one skill directory.
export function checkSkill(dir, { kind, allow = [] } = {}, deps = defaults) {
  const files = deps.list(dir);
  const found = [...checkLayout(files)];
  if (files.includes('SKILL.md')) {
    const content = deps.read(join(dir, 'SKILL.md'));
    try {
      const { fields, lineOf, endLine } = parseFrontmatter(content);
      found.push(...checkFrontmatter(fields, basename(resolve(dir)), lineOf));
      found.push(...checkBody(content, { kind, hasBundled: files.length > 1, bodyStart: endLine }));
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      found.push(error('frontmatter-malformed', 'F6', 'SKILL.md', 1, err.message));
    }
    found.push(...checkLinks(content, files));
    found.push(...checkReferences(files, dir, deps));
  }
  found.push(...checkStandalone(files, dir, deps, allow));
  const strip = (f) => ({ id: f.id, rubric: f.rubric, file: f.file, line: f.line, message: f.message });
  const errors = found.filter((f) => f.level === 'error').map(strip);
  const warnings = found.filter((f) => f.level === 'warning').map(strip);
  return { ok: errors.length === 0, errors, warnings };
}

// Parses argv into { dir, kind, allow } or { usage: true } on bad input.
export function parseArgs(argv) {
  const rest = [];
  const allow = [];
  let kind;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--kind') {
      kind = argv[i + 1];
      i += 1;
      if (!KINDS.includes(kind)) return { usage: true };
    } else if (argv[i] === '--allow') {
      const path = argv[i + 1];
      i += 1;
      if (!path || path.startsWith('--')) return { usage: true };
      allow.push(posix.normalize(path));
    } else rest.push(argv[i]);
  }
  return rest.length === 1 ? { dir: rest[0], kind, allow } : { usage: true };
}

// Returns the exit code: 0 ok, 1 errors, 2 bad usage.
export function main(argv, deps = defaults) {
  const args = parseArgs(argv);
  if (args.usage) {
    deps.error(USAGE);
    return 2;
  }
  let result;
  try {
    result = checkSkill(args.dir, { kind: args.kind, allow: args.allow }, deps);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    deps.error(`check-skill: ${args.dir} not found`);
    return 2;
  }
  deps.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`check-skill: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
