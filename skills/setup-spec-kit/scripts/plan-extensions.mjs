// Read-only plan for setup-spec-kit: extension adds and priority fixes, missing skill dirs, and the `.gitignore` lines still missing.
// CLI: `plan-extensions.mjs [--wanted id=n,id=n] [--gitignore <path>]` runs `specify extension list --json`; `--latest-tag` runs `git ls-remote`; JSON on stdout.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

const SPEC_KIT_REPO = 'https://github.com/github/spec-kit.git';
// Ids and priorities from the skill Rules (lower number wins).
export const DEFAULT_WANTED = 'agent-context=10,assess=20,bug=30';
// Lines from step 4 of the skill.
export const IGNORE_LINES = [
  '.specify/extensions/.cache/',
  '.specify/extensions/.backup/',
  '.specify/extensions/*/*.local.yml',
  '.specify/extensions/.registry'
];

// Skill dirs under `.claude/skills/` per source, from references/required-skills.md.
export const REQUIRED_SKILLS = {
  core: [
    'speckit-constitution',
    'speckit-specify',
    'speckit-clarify',
    'speckit-plan',
    'speckit-checklist',
    'speckit-tasks',
    'speckit-analyze',
    'speckit-implement',
    'speckit-converge'
  ],
  assess: [
    'speckit-assess-intake',
    'speckit-assess-research',
    'speckit-assess-define',
    'speckit-assess-shape',
    'speckit-assess-decide'
  ],
  bug: ['speckit-bug-assess', 'speckit-bug-fix', 'speckit-bug-test']
};

// Highest `vX.Y.Z` tag in `git ls-remote --tags --refs` output, or null when none matches.
export function latestTag(text) {
  let best = null;
  for (const line of String(text ?? '').split('\n')) {
    const m = /\trefs\/tags\/(v(\d+)\.(\d+)\.(\d+))$/.exec(line.trim());
    if (!m) continue;
    const nums = [m[2], m[3], m[4]].map(Number);
    const diff = best ? nums.map((n, i) => n - best.nums[i]).find((d) => d !== 0) : 1;
    if (diff > 0) best = { tag: m[1], nums };
  }
  return best?.tag ?? null;
}

// `exists(dir)` tells whether a skill dir is present; returns the missing dir names per source.
export function missingSkills({ exists, skills = REQUIRED_SKILLS }) {
  return Object.fromEntries(
    Object.entries(skills)
      .map(([source, names]) => [source, names.filter((n) => !exists(n))])
      .filter(([, names]) => names.length)
  );
}

// Parses `id=n,id=n` into ordered `{ id, priority }` entries; throws on a malformed entry.
export function parseWanted(text) {
  const entries = String(text ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const m = /^([a-z0-9][a-z0-9-]*)=(\d+)$/.exec(pair);
      if (!m) throw new Error(`invalid --wanted entry "${pair}"; use id=number`);
      return { id: m[1], priority: Number(m[2]) };
    });
  if (!entries.length) throw new Error('--wanted lists no extensions');
  if (new Set(entries.map((e) => e.id)).size !== entries.length) throw new Error('--wanted repeats an id');
  return entries;
}

// `list` is the parsed `extension list --json` (an array, or an object with an `extensions` array); `wanted` is parseWanted output.
export function planExtensions({ list, wanted }) {
  const items = Array.isArray(list) ? list : list?.extensions;
  if (!Array.isArray(items)) throw new Error('extension list JSON is neither an array nor has an `extensions` array');
  const have = new Map();
  for (const item of items) {
    if (item && typeof item === 'object' && typeof item.id === 'string') have.set(item.id, item.priority);
  }
  const plan = { adds: [], priorityFixes: [], ok: [] };
  for (const { id, priority } of wanted) {
    if (!have.has(id)) plan.adds.push({ id, priority });
    else if (Number(have.get(id)) !== priority)
      plan.priorityFixes.push({ id, from: have.get(id) ?? null, to: priority });
    else plan.ok.push(id);
  }
  return plan;
}

// `content` is the ignore file text, or null when the file is absent; returns the lines to append, in order.
export function missingIgnoreLines({ content, lines = IGNORE_LINES }) {
  const present = new Set(
    (content ?? '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
  );
  return lines.filter((l) => !present.has(l));
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  existsSync,
  readFileSync,
  run: (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 30000 }),
  cwd: () => process.cwd(),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length === 1 && argv[0] === '--latest-tag') {
    const tag = latestTag(d.run('git', ['ls-remote', '--tags', '--refs', SPEC_KIT_REPO]));
    d.log(JSON.stringify(tag ? { ok: true, tag } : { ok: false, error: 'no vX.Y.Z tag found' }));
    return tag ? 0 : 1;
  }
  const known = new Set(['--wanted', '--gitignore']);
  if (argv.length % 2 || argv.some((a, i) => (i % 2 === 0 ? !known.has(a) : false))) {
    d.error('usage: plan-extensions.mjs [--latest-tag | --wanted id=n,id=n --gitignore <path>]');
    return 2;
  }
  const root = path.resolve(d.cwd());
  const file = path.resolve(root, arg(argv, '--gitignore') ?? '.gitignore');
  const rel = path.relative(root, file);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    d.log(JSON.stringify({ ok: false, error: `${file} is outside the project directory` }));
    return 1;
  }
  let wanted;
  let list;
  try {
    wanted = parseWanted(arg(argv, '--wanted') ?? DEFAULT_WANTED);
    list = JSON.parse(d.run('specify', ['extension', 'list', '--json']));
  } catch (err) {
    if (!(err instanceof SyntaxError) && !/^(invalid --wanted|--wanted )/.test(err?.message ?? '')) throw err;
    d.log(JSON.stringify({ ok: false, error: String(err.message).split('\n')[0] }));
    return 1;
  }
  let extensions;
  try {
    extensions = planExtensions({ list, wanted });
  } catch (err) {
    if (!/^extension list JSON/.test(err?.message ?? '')) throw err;
    d.log(JSON.stringify({ ok: false, error: err.message }));
    return 1;
  }
  const exists = d.existsSync(file);
  const missing = missingIgnoreLines({ content: exists ? d.readFileSync(file, 'utf8') : null });
  const skills = missingSkills({ exists: (n) => d.existsSync(path.join(root, '.claude', 'skills', n)) });
  d.log(JSON.stringify({ ok: true, extensions, skills: { missing: skills }, gitignore: { file, exists, missing } }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'plan-extensions');
