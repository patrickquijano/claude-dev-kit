// Formatters and linters shared by the format-lint hooks, keyed by file extension.
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

export const win = process.platform === 'win32';
export const FILE = '{file}';

// Step: {kind, cmd, args, strict?, npx?, probe?, configs?, stdout?, skip?}; `alt` runs the first available candidate.
// `configs` skips the step unless one of those files exists in the project root; `skip(text)` skips it by file content.
// `strict` args make warnings fail; only the repository-wide Stop hook adds them.
const prettier = { kind: 'Format', npx: true, cmd: 'prettier', args: ['-w', '--ignore-unknown'] };
const eslint = {
  kind: 'Lint',
  npx: true,
  cmd: 'eslint',
  args: ['--fix'],
  strict: ['--max-warnings', '0', '--no-warn-ignored'],
  configs: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `eslint.config.${e}`)
};
const stylelint = {
  kind: 'Lint',
  npx: true,
  cmd: 'stylelint',
  args: ['--fix'],
  strict: ['--max-warnings', '0'],
  configs: [
    ...['', '.json', '.yaml', '.yml', '.js', '.cjs', '.mjs'].map((e) => `.stylelintrc${e}`),
    ...['js', 'cjs', 'mjs', 'ts'].map((e) => `stylelint.config.${e}`)
  ]
};
const csharpier = (sub, kind) => ({ kind, cmd: 'dotnet', args: ['csharpier', sub], probe: ['csharpier', '--version'] });
export const groups = [
  [['cs'], [csharpier('format', 'Format'), csharpier('check', 'Lint')]],
  [
    ['md', 'markdown'],
    [prettier, { kind: 'Lint', npx: true, cmd: 'markdownlint-cli2', args: ['--fix'] }]
  ],
  // hadolint cannot parse heredocs (`RUN <<EOF`), so it would block valid Dockerfiles.
  [
    ['dockerfile'],
    [{ kind: 'Lint', cmd: 'hadolint', args: [], skip: (text) => /^\s*(RUN|COPY|ADD)\b.*<<-?["']?\w+/im.test(text) }]
  ],
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
      { kind: 'Lint', cmd: 'yamllint', args: [], strict: ['--strict'] }
    ]
  ]
];
export const TABLE = Object.fromEntries(groups.flatMap(([exts, steps]) => exts.map((e) => [e, steps])));

// Table key of a path: `dockerfile` for Dockerfile and Dockerfile.*, else the lowercased extension.
export function keyOf(file) {
  const base = path.basename(file);
  return base === 'Dockerfile' || base.startsWith('Dockerfile.')
    ? 'dockerfile'
    : path.extname(base).slice(1).toLowerCase();
}

export const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

export function run(cmd, args, cwd, timeout = 60_000) {
  const opts = { cwd, encoding: 'utf8', timeout, maxBuffer: 1 << 26, env: { ...process.env, NO_COLOR: '1' } };
  if (!win) return spawnSync(cmd, args, opts);
  const quoted = [path.normalize(cmd), ...args].map((a) => `"${a}"`);
  return spawnSync(quoted[0], quoted.slice(1), { ...opts, shell: true });
}

// Native tools must exist on PATH (or in the project for relative commands); npx tools always run.
export function available(step, cwd) {
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
export async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
