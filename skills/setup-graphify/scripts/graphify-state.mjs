// State checks and line-based ignore appends for setup-graphify; `state` is read-only, `append` writes only missing lines.
// CLI: `graphify-state.mjs state --root <dir>` or `graphify-state.mjs append --root <dir> [--create-gitignore]`; JSON on stdout.
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const GITIGNORE_BLOCK = ['graphify-out/*', '!graphify-out/graph.json', '!graphify-out/GRAPH_REPORT.md'];
const CONFLICTS = new Set(['graphify-out/', '/graphify-out', 'graphify-out', '/graphify-out/']);
const IGNORE_FILES = ['.prettierignore', '.markdownlintignore', '.stylelintignore', '.eslintignore', '.dockerignore'];
const GRAPH_FILES = ['graph.html', 'GRAPH_REPORT.md', 'graph.json'];
const SKILL_MARKER = path.join('.claude', 'skills', 'graphify', '.graphify_version');
const PLACEHOLDER = /^### Community \d+ - "Community \d+"/;

const lineSet = (text) => text.split(/\r?\n/).map((l) => l.trim());

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  exists: existsSync,
  read: (p) => readFileSync(p, 'utf8'),
  write: (p, text) => writeFileSync(p, text),
  list: (dir) => readdirSync(dir),
  home: homedir(),
  log: (text) => console.log(text),
  error: (text) => console.error(text),
  assetPath: fileURLToPath(new URL('../assets/graphify-rules.md', import.meta.url))
};

const validRoot = (root) => typeof root === 'string' && path.isAbsolute(root);

// Which of `want` the file text lacks, in order.
const missingLines = (text, want) => {
  const have = new Set(lineSet(text));
  return want.filter((l) => !have.has(l));
};

function gitignoreState(root, d) {
  const file = path.join(root, '.gitignore');
  if (!d.exists(file)) return { exists: false, conflict: null, missing: GITIGNORE_BLOCK };
  const text = d.read(file);
  const conflict = lineSet(text).find((l) => CONFLICTS.has(l)) ?? null;
  return { exists: true, conflict, missing: missingLines(text, GITIGNORE_BLOCK) };
}

function ignoreFilesState(root, d) {
  const flat = d.list(root).some((n) => n.startsWith('eslint.config.'));
  return IGNORE_FILES.filter((f) => d.exists(path.join(root, f)) && !(f === '.eslintignore' && flat)).map((file) => ({
    file,
    missing: missingLines(d.read(path.join(root, file)), ['graphify-out/']).length > 0
  }));
}

// Reports steps 3-9 state under `root`: skill, Claude hooks, graph files, placeholder names, ignores, rules file, CLAUDE.md section.
export function readState({ root } = {}, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (!validRoot(root)) return { ok: false, error: 'root must be an absolute path' };
  const at = (...p) => path.join(root, ...p);
  const out = at('graphify-out');
  const settings = at('.claude', 'settings.json');
  const report = at('graphify-out', 'GRAPH_REPORT.md');
  const rules = at('.claude', 'rules', 'graphify.md');
  const claudeMd = at('CLAUDE.md');
  let skill = 'none';
  if (d.exists(at(SKILL_MARKER))) skill = 'project';
  else if (d.exists(path.join(d.home, SKILL_MARKER))) skill = 'user';
  const missingGraph = GRAPH_FILES.filter((f) => !d.exists(path.join(out, f)));
  let rulesState = 'absent';
  if (d.exists(rules)) rulesState = d.read(rules) === d.read(d.assetPath) ? 'identical' : 'differs';
  return {
    ok: true,
    skill,
    claudeHooks: d.exists(settings) && d.read(settings).includes('hook-guard'),
    graph: { present: missingGraph.length === 0, missing: missingGraph },
    placeholders: d.exists(report) ? lineSet(d.read(report)).filter((l) => PLACEHOLDER.test(l)).length : 0,
    gitignore: gitignoreState(root, d),
    ignoreFiles: ignoreFilesState(root, d),
    rules: rulesState,
    claudeMdSection: d.exists(claudeMd) && lineSet(d.read(claudeMd)).includes('## graphify')
  };
}

const appended = (text, lines) => `${text && !text.endsWith('\n') ? `${text}\n` : text}${lines.join('\n')}\n`;

// Appends the missing `.gitignore` block lines and `graphify-out/` to existing line-based ignore files; a conflicting `graphify-out/` line or a missing `.gitignore` without `createGitignore` is skipped.
export function applyAppends({ root, createGitignore = false } = {}, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (!validRoot(root)) return { ok: false, error: 'root must be an absolute path' };
  const changes = [];
  const skipped = [];
  const gi = gitignoreState(root, d);
  const giFile = path.join(root, '.gitignore');
  if (gi.conflict) skipped.push({ file: '.gitignore', reason: `existing line ${gi.conflict}` });
  else if (gi.missing.length && !gi.exists && !createGitignore) skipped.push({ file: '.gitignore', reason: 'absent' });
  else if (gi.missing.length) {
    d.write(giFile, appended(gi.exists ? d.read(giFile) : '', gi.missing));
    changes.push({ file: '.gitignore', added: gi.missing });
  }
  for (const { file, missing } of ignoreFilesState(root, d)) {
    if (!missing) continue;
    const target = path.join(root, file);
    d.write(target, appended(d.read(target), ['graphify-out/']));
    changes.push({ file, added: ['graphify-out/'] });
  }
  return { ok: true, changes, skipped };
}

const USAGE = 'usage: graphify-state.mjs state --root <dir> | append --root <dir> [--create-gitignore]';

function parse(argv) {
  const [cmd, ...rest] = argv;
  if (cmd !== 'state' && cmd !== 'append') return null;
  const opts = { cmd, root: undefined, createGitignore: false };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--root' && rest[i + 1]) {
      opts.root = rest[i + 1];
      i += 1;
    } else if (rest[i] === '--create-gitignore' && cmd === 'append') opts.createGitignore = true;
    else return null;
  }
  return opts.root ? opts : null;
}

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const opts = parse(argv);
  if (!opts) {
    d.error(USAGE);
    return 2;
  }
  const result =
    opts.cmd === 'state'
      ? readState({ root: opts.root }, deps)
      : applyAppends({ root: opts.root, createGitignore: opts.createGitignore }, deps);
  d.log(JSON.stringify(result));
  return result.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'graphify-state');
