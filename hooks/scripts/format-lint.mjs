// PostToolUse hook: format and lint the file Claude just wrote or edited.
// Prints one JSON object; failures block with the tool output so Claude can fix them.
import { spawnSync } from 'node:child_process';
import { realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const win = process.platform === 'win32';
const FILE = '{file}';

// Step: {kind, cmd, args, npx?, probe?, configs?, stdout?}; `alt` runs the first available candidate.
// `configs` skips the step unless one of those files exists in the project root.
const prettier = { kind: 'Format', npx: true, cmd: 'prettier', args: ['-w', '--ignore-unknown'] };
const eslint = {
  kind: 'Lint',
  npx: true,
  cmd: 'eslint',
  args: ['--fix'],
  configs: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `eslint.config.${e}`)
};
const stylelint = {
  kind: 'Lint',
  npx: true,
  cmd: 'stylelint',
  args: ['--fix'],
  configs: [
    ...['', '.json', '.yaml', '.yml', '.js', '.cjs', '.mjs'].map((e) => `.stylelintrc${e}`),
    ...['js', 'cjs', 'mjs', 'ts'].map((e) => `stylelint.config.${e}`)
  ]
};
const csharpier = (sub, kind) => ({ kind, cmd: 'dotnet', args: ['csharpier', sub], probe: ['csharpier', '--version'] });
const groups = [
  [['cs'], [csharpier('format', 'Format'), csharpier('check', 'Lint')]],
  [
    ['md', 'markdown'],
    [prettier, { kind: 'Lint', npx: true, cmd: 'markdownlint-cli2', args: ['--fix'] }]
  ],
  [['dockerfile'], [{ kind: 'Lint', cmd: 'hadolint', args: [] }]],
  [
    ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'html', 'htm'],
    [prettier, eslint]
  ],
  [
    ['css', 'scss', 'sass', 'less'],
    [prettier, stylelint]
  ],
  [
    ['php'],
    [
      {
        kind: 'Format',
        alt: [
          { cmd: 'vendor/bin/pint', args: [] },
          { cmd: 'vendor/bin/php-cs-fixer', args: ['fix'] }
        ]
      }
    ]
  ],
  [
    ['xml'],
    [
      prettier,
      {
        kind: 'Format',
        alt: [
          { cmd: 'xmlstarlet', args: ['fo'], stdout: true },
          { cmd: 'xmllint', args: ['--format', FILE, '--output', FILE] }
        ]
      },
      { kind: 'Lint', cmd: 'xmllint', args: ['--noout'] }
    ]
  ],
  [
    ['yaml', 'yml'],
    [
      { kind: 'Format', cmd: 'yamlfmt', args: [] },
      { kind: 'Lint', cmd: 'yamllint', args: [] }
    ]
  ]
];
const TABLE = Object.fromEntries(groups.flatMap(([exts, steps]) => exts.map((e) => [e, steps])));

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

function run(cmd, args, cwd) {
  const opts = { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, NO_COLOR: '1' } };
  if (!win) return spawnSync(cmd, args, opts);
  const quoted = [path.normalize(cmd), ...args].map((a) => `"${a}"`);
  return spawnSync(quoted[0], quoted.slice(1), { ...opts, shell: true });
}

// Native tools must exist on PATH (or in the project for relative commands); npx tools always run.
function available(step, cwd) {
  if (step.configs && !step.configs.some((f) => isFile(path.join(cwd, f)))) return false;
  if (step.npx) return true;
  const exts = win ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')] : [''];
  const dirs = step.cmd.includes('/') ? [cwd] : (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  if (!dirs.some((d) => exts.some((e) => isFile(path.join(d, step.cmd + e))))) return false;
  if (!step.probe) return true;
  const r = run(step.cmd, step.probe, cwd);
  return !r.error && r.status === 0;
}

// Reads stdin asynchronously; sync reads of a piped fd 0 can throw EAGAIN on Windows.
async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string' || !isFile(file) || (win && file.includes('"'))) return;
  let projectDir, abs;
  try {
    projectDir = realpathSync(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    abs = realpathSync(file);
  } catch {
    return;
  }
  const rel = path.relative(projectDir, abs);
  const segments = rel.split(/[\\/]/);
  if (!rel || path.isAbsolute(rel) || segments[0] === '..') return;
  if (segments.some((s) => s === 'node_modules' || s === '.git')) return;

  const base = path.basename(abs);
  const key =
    base === 'Dockerfile' || base.startsWith('Dockerfile.') ? 'dockerfile' : path.extname(base).slice(1).toLowerCase();
  const target = rel.split(path.sep).join('/');
  const lines = [];
  const failures = [];
  for (const entry of TABLE[key] || []) {
    const step = entry.alt ? entry.alt.find((c) => available(c, projectDir)) : entry;
    if (!step || !available(step, projectDir)) continue;
    const args = step.args.includes(FILE) ? step.args.map((a) => (a === FILE ? target : a)) : [...step.args, target];
    const [cmd, argv] = step.npx ? ['npx', ['--yes', step.cmd, ...args]] : [step.cmd, args];
    const r = run(cmd, argv, projectDir);
    const ok = !r.error && r.status === 0;
    if (ok && step.stdout) {
      const tmp = `${abs}.${process.pid}.tmp`;
      writeFileSync(tmp, r.stdout);
      renameSync(tmp, abs);
    }
    lines.push(`${ok ? '✅' : '❌'} ${entry.kind}: ${target}`);
    if (!ok) {
      const out = [step.stdout ? '' : r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim();
      failures.push(`$ ${[cmd, ...argv].join(' ')}\n${out}`);
    }
  }
  if (!lines.length) return;
  const result = { systemMessage: lines.join('\n') };
  if (failures.length) {
    result.decision = 'block';
    result.reason = `Format/lint issues in ${target}; fix these issues:\n${failures.join('\n\n')}`.slice(0, 8000);
  }
  process.stdout.write(JSON.stringify(result));
}

await main();
