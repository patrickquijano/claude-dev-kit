// Mechanical checks for one skill directory (frontmatter, size, layout, links, self-containment, Output); prints JSON.
// Self-contained on purpose: plugin installs have no node_modules, and no skill may link another skill's files.
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Recursive file listing as POSIX paths relative to `dir`.
function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === '.DS_Store') continue; // macOS metadata; any other dotfile is listed and flagged by checkLayout
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

const USAGE = 'usage: validate-skill.mjs <skill-dir> [--kind task|reference|background-only]';
const KINDS = ['task', 'reference', 'background-only'];
// Copied from the Fields table in references/rules.md.
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
// Portable fields; any other known field is Claude Code-only.
const PORTABLE_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const SIDE_EFFECT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
const RESERVED_DIRS = new Set(['synced', 'anthropic-skills']);
const ALLOWED_TOP = new Set(['SKILL.md', 'references', 'assets', 'scripts']);
const ACTOR_SUFFIX = /(er|or|ist|ant)$/;
// A verb-first name (`setup-devcontainer`) names an action, so its object may end like an actor.
const LEADING_VERB = new Set([
  'add',
  'address',
  'assess',
  'build',
  'bump',
  'check',
  'commit',
  'create',
  'debug',
  'deploy',
  'draft',
  'fix',
  'format',
  'generate',
  'implement',
  'lint',
  'make',
  'prepare',
  'publish',
  'rebase',
  'review',
  'run',
  'scan',
  'set',
  'setup',
  'switch',
  'test',
  'update',
  'upgrade',
  'write'
]);
const FENCE = /^\s*```/;

export class FrontmatterError extends Error {}

const error = (id, rule, file, line, message) => ({ level: 'error', id, rule, file, line, message });
const warning = (id, rule, file, line, message) => ({ level: 'warning', id, rule, file, line, message });

// Strips surrounding quotes from a scalar.
function unquote(value) {
  const v = value.trim();
  const quoted = v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0];
  return quoted ? v.slice(1, -1) : v;
}

// Parses the frontmatter subset validate-skill needs: top-level `key: value`, quoted strings, `- item` block lists, and
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

// First or second person in a description ("I help", "you can", "we").
const PERSON = /(?:^|[.!?]\s+)I\s|\bI'[a-z]+|\b(?:you|your|yours|we|our|my)\b/i;

// Tool names of an allowed-tools value, splitting on whitespace and commas outside parentheses.
function toolNames(value) {
  const names = [];
  let depth = 0;
  let token = '';
  for (const ch of text(value)) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (depth === 0 && /[\s,]/.test(ch)) {
      if (token) names.push(token.replace(/\(.*$/, ''));
      token = '';
    } else token += ch;
  }
  if (token) names.push(token.replace(/\(.*$/, ''));
  return names;
}

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
    const parts = name.split('-');
    const last = parts[parts.length - 1];
    if (!LEADING_VERB.has(parts[0]) && ACTOR_SUFFIX.test(last)) {
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
  if (description && PERSON.test(description))
    found.push(
      error('description-person', 'F9', 'SKILL.md', line, 'description uses first or second person: write third person')
    );
  const combined = description.length + text(fields.when_to_use).length;
  if (combined > 1536)
    found.push(
      error('listing-length', 'F3', 'SKILL.md', line, `description + when_to_use is ${combined} chars, max 1,536`)
    );
  const ccKeys = Object.keys(fields).filter((k) => KNOWN_FIELDS.has(k) && !PORTABLE_FIELDS.has(k));
  if (ccKeys.length > 0 && !/claude code/i.test(text(fields.compatibility))) {
    found.push(
      error(
        'compat-missing',
        'F10',
        'SKILL.md',
        ccKeys.map(at)[0],
        `Claude Code-only key "${ccKeys[0]}" needs a compatibility field that says "Claude Code only" and warns that claude.ai and API uploads reject unknown keys`
      )
    );
  }
  if (fields.context === 'fork' && !('background' in fields))
    found.push(
      warning(
        'fork-background',
        'F11',
        'SKILL.md',
        at('context'),
        'context: fork without background; set background: false when the result is needed this turn'
      )
    );
  if ('agent' in fields && fields.context !== 'fork')
    found.push(error('agent-without-fork', 'F12', 'SKILL.md', at('agent'), 'agent only applies with context: fork'));
  const risky = toolNames(fields['allowed-tools']).filter((t) => SIDE_EFFECT_TOOLS.has(t));
  if (risky.length > 0 && String(fields['disable-model-invocation']) !== 'true')
    found.push(
      warning(
        'side-effect-invocation',
        'F13',
        'SKILL.md',
        at('allowed-tools'),
        `allowed-tools has ${risky.join(', ')} without disable-model-invocation: true`
      )
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

  lines.forEach((l, i) => {
    if (
      i >= bodyStart &&
      !/\bnever\b/i.test(l) &&
      /\b(?:[Ss]pawn(?:s|ed|ing)?|[Dd]elegat(?:e|es|ed|ing))\b[^\n]*(\bExplore\b|general-purpose)/.test(l)
    ) {
      found.push(
        warning(
          'spawn-builtin',
          'B8',
          'SKILL.md',
          i + 1,
          'spawns Explore or general-purpose: name a cdk: agent instead'
        )
      );
    }
  });

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
      const output = lines.slice(start, end);
      if (!output.some((l) => /^Result:/.test(l))) {
        found.push(error('output-result', 'Q1', 'SKILL.md', start + 1, 'Output has no "Result:" line'));
      }
      if (!output.some((l) => /^Next:/.test(l))) {
        found.push(warning('output-next', 'Q4', 'SKILL.md', start + 1, 'Output has no "Next:" follow-up line'));
      }
    }
  }
  return found;
}

// L2: only SKILL.md, references/, assets/, scripts/ beside the skill, and no dotfile or dot-directory (`.env`, `.git/`).
export function checkLayout(files) {
  const found = [];
  if (!files.includes('SKILL.md')) found.push(error('skill-missing', 'L2', 'SKILL.md', 1, 'SKILL.md not found'));
  for (const file of files) {
    if (file.split('/').some((part) => part.startsWith('.'))) {
      found.push(
        error('dotfile', 'L2', file, 1, `"${file}" is a dotfile; a skill ships none (only .DS_Store is ignored)`)
      );
      continue;
    }
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

// L3: nothing in the skill may reference a path outside its own directory (another skill, the plugin root, ../..).
export function checkStandalone(files, dir, deps = defaults) {
  const found = [];
  const outside = (file, line, what) =>
    found.push(error('link-outside', 'L3', file, line, `${what} leaves the skill directory`));
  const leaves = (file, target) => posix.join(posix.dirname(file), target).startsWith('..');
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
        if (/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\//.test(line)) outside(file, at, 'a ${CLAUDE_PLUGIN_ROOT}/skills/ path');
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

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
const TIME_SENSITIVE = new RegExp(
  `\\bcurrently\\b|\\bas of\\s+(?:${MONTH}|\\d{4})|\\b(?:before|after|until|since)\\s+(?:${MONTH}\\s+)?(?:19|20)\\d\\d\\b`,
  'i'
);
// A `${CLAUDE_SKILL_DIR}/..` link is reported by checkStandalone, so it is removed before the path scan.
const SKILL_DIR_LINK = /\$\{CLAUDE_SKILL_DIR\}\/\S*/g;
const PARENT_PATH = /(?:^|[\s`([="'/])\.\.\//;
const ABSOLUTE_PATH = /(?:^|[\s`([="'])(?:\/Users\/|\/home\/|~\/(?!\.claude\/)|[A-Za-z]:\\)/;
const BACKSLASH_PATH = /\b(?:references|assets|scripts)\\\S/;
const BUNDLED_MD =
  /(?:\]\(\.?\/?|\b(?:\$\{CLAUDE_SKILL_DIR\}\/)?(?=(?:references|assets)\/))((?:references|assets)\/[\w.-]+\.md|[\w.-]+\.md)/g;

// L4, L5, B10, B11 across the skill's Markdown files: reserved folders, escaping or absolute paths, nested references, time-sensitive text.
export function checkSelfContained(files, dir, deps = defaults) {
  const found = [];
  for (const file of files) {
    if (file.split('/').some((part) => RESERVED_DIRS.has(part)))
      found.push(
        error('reserved-folder', 'L4', file, 1, `"${file}" sits in a reserved folder name (synced, anthropic-skills)`)
      );
  }
  const mdFiles = files.filter((f) => f.endsWith('.md'));
  for (const file of mdFiles) {
    const isRef = file.startsWith('references/');
    deps
      .read(join(dir, file))
      .split('\n')
      .forEach((raw, i) => {
        const at = i + 1;
        const line = raw.replace(SKILL_DIR_LINK, '');
        if (PARENT_PATH.test(line))
          found.push(
            error('path-parent', 'L5', file, at, 'parent-directory path: keep every path inside the skill folder')
          );
        if (ABSOLUTE_PATH.test(line))
          found.push(
            error(
              'path-absolute',
              'L5',
              file,
              at,
              'absolute or home path: use a path relative to the skill, or CLAUDE_SKILL_DIR'
            )
          );
        if (BACKSLASH_PATH.test(line))
          found.push(error('path-backslash', 'L5', file, at, 'backslash path: use forward slashes'));
        if (TIME_SENSITIVE.test(line))
          found.push(
            warning('time-sensitive', 'B11', file, at, 'time-sensitive text (dated or "currently"): it will go stale')
          );
        if (isRef) {
          for (const m of raw.matchAll(BUNDLED_MD)) {
            const target = m[1].includes('/') ? m[1] : posix.join('references', m[1]);
            if (target !== file && files.includes(target))
              found.push(
                error(
                  'nested-reference',
                  'B10',
                  file,
                  at,
                  `links to "${target}": a reference must not link another bundled file`
                )
              );
          }
        }
      });
  }
  return found;
}

// Runs every check on one skill directory.
export function checkSkill(dir, { kind } = {}, deps = defaults) {
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
  found.push(...checkSelfContained(files, dir, deps));
  found.push(...checkStandalone(files, dir, deps));
  const strip = (f) => ({ id: f.id, rule: f.rule, file: f.file, line: f.line, message: f.message });
  const errors = found.filter((f) => f.level === 'error').map(strip);
  const warnings = found.filter((f) => f.level === 'warning').map(strip);
  return { ok: errors.length === 0, errors, warnings };
}

// Parses argv into { dir, kind } or { usage: true } on bad input.
export function parseArgs(argv) {
  const rest = [];
  let kind;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--kind') {
      kind = argv[i + 1];
      i += 1;
      if (!KINDS.includes(kind)) return { usage: true };
    } else rest.push(argv[i]);
  }
  return rest.length === 1 ? { dir: rest[0], kind } : { usage: true };
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
    result = checkSkill(args.dir, { kind: args.kind }, deps);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    deps.error(`validate-skill: ${args.dir} not found`);
    return 2;
  }
  deps.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`validate-skill: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
