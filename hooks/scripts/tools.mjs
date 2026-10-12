// Formatters and linters shared by the format-lint hooks, keyed by file extension.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const win = process.platform === 'win32';
export const FILE = '{file}';

// Step: {kind, cmd, args, strict?, npx?, probe?, configs?, pkgKey?, requireConfig?, stdout?, skip?}; `alt` runs the first
// available candidate. `configs` (files in the project root) and `pkgKey` (a package.json key) mark a step as configured;
// `requireConfig` skips it without one; `skip(text)` skips it by file content. An npx step runs only when installed in
// the project (`node_modules/.bin`) or configured, and never downloads (`--no-install`).
// `strict` args make warnings fail; only the repository-wide Stop hook adds them.
const prettier = {
  kind: 'Format',
  npx: true,
  cmd: 'prettier',
  args: ['-w', '--ignore-unknown'],
  pkgKey: 'prettier',
  configs: [
    ...['', '.json', '.json5', '.yaml', '.yml', '.toml', '.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'].map(
      (e) => `.prettierrc${e}`
    ),
    ...['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'].map((e) => `prettier.config.${e}`)
  ]
};
const eslint = {
  kind: 'Lint',
  npx: true,
  cmd: 'eslint',
  args: ['--fix'],
  requireConfig: true,
  strict: ['--max-warnings', '0', '--no-warn-ignored'],
  configs: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `eslint.config.${e}`)
};
const stylelint = {
  kind: 'Lint',
  npx: true,
  cmd: 'stylelint',
  args: ['--fix'],
  requireConfig: true,
  strict: ['--max-warnings', '0'],
  configs: [
    ...['', '.json', '.yaml', '.yml', '.js', '.cjs', '.mjs'].map((e) => `.stylelintrc${e}`),
    ...['js', 'cjs', 'mjs', 'ts'].map((e) => `stylelint.config.${e}`)
  ]
};
const markdownlint = {
  kind: 'Lint',
  npx: true,
  cmd: 'markdownlint-cli2',
  args: ['--fix'],
  configs: [
    ...['', '.json', '.jsonc', '.yaml', '.yml'].map((e) => `.markdownlint${e}`),
    ...['jsonc', 'yaml', 'cjs', 'mjs'].map((e) => `.markdownlint-cli2.${e}`)
  ]
};
const csharpier = (sub, kind) => ({ kind, cmd: 'dotnet', args: ['csharpier', sub], probe: ['csharpier', '--version'] });
export const groups = [
  [['cs'], [csharpier('format', 'Format'), csharpier('check', 'Lint')]],
  [
    ['md', 'markdown'],
    [prettier, markdownlint]
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

// Table key of a path: `dockerfile` for Dockerfile and Dockerfile.* (not *.dockerignore), else the lowercased extension.
export function keyOf(file) {
  const base = path.basename(file);
  return base === 'Dockerfile' || (base.startsWith('Dockerfile.') && !base.endsWith('.dockerignore'))
    ? 'dockerfile'
    : path.extname(base).slice(1).toLowerCase();
}

export const isFile = (p, deps = {}) => {
  try {
    return (deps.statSync ?? statSync)(p).isFile();
  } catch {
    return false;
  }
};

// `deps` (all optional): spawn, win, env.
export function run(cmd, args, cwd, timeout = 60_000, deps = {}) {
  const { spawn = spawnSync, win: isWin = win, env = process.env } = deps;
  const opts = { cwd, encoding: 'utf8', timeout, maxBuffer: 1 << 26, env: { ...env, NO_COLOR: '1' } };
  if (!isWin) return spawn(cmd, args, opts);
  const quoted = [path.normalize(cmd), ...args].map((a) => `"${a}"`);
  return spawn(quoted[0], quoted.slice(1), { ...opts, shell: true });
}

// True when `node_modules/.bin/<cmd>` exists in the project. `deps` (all optional): isFile, win, env.
export function installed(cmd, cwd, deps = {}) {
  const { isFile: exists = isFile, win: isWin = win, env = process.env } = deps;
  const exts = isWin ? ['', ...(env.PATHEXT || '.EXE;.CMD;.BAT').split(';')] : [''];
  return exts.some((e) => exists(path.join(cwd, 'node_modules', '.bin', cmd + e)));
}

// True when package.json in the project root has the top-level key. `deps` (optional): readFile.
function hasPackageKey(key, cwd, deps = {}) {
  const { readFile = (f) => readFileSync(f, 'utf8') } = deps;
  try {
    const pkg = JSON.parse(readFile(path.join(cwd, 'package.json')));
    return pkg !== null && typeof pkg === 'object' && Object.hasOwn(pkg, key);
  } catch {
    return false;
  }
}

// Native tools must exist on PATH (or in the project for relative commands); npx tools must be installed in the project
// or configured there, so nothing is downloaded or run in a project that never asked for it.
// `deps` (all optional): isFile, run, win, env, readFile.
export function available(step, cwd, deps = {}) {
  const { isFile: exists = isFile, run: exec = run, win: isWin = win, env = process.env } = deps;
  const configured =
    !!step.configs?.some((f) => exists(path.join(cwd, f))) || (!!step.pkgKey && hasPackageKey(step.pkgKey, cwd, deps));
  if (step.requireConfig && !configured) return false;
  if (step.npx) return configured || installed(step.cmd, cwd, deps);
  if (step.configs && !configured) return false;
  const exts = isWin ? ['', ...(env.PATHEXT || '.EXE;.CMD;.BAT').split(';')] : [''];
  const dirs = step.cmd.includes('/') ? [cwd] : (env.PATH || '').split(path.delimiter).filter(Boolean);
  if (!dirs.some((d) => exts.some((e) => exists(path.join(d, step.cmd + e))))) return false;
  if (!step.probe) return true;
  const r = exec(step.cmd, step.probe, cwd);
  return !r.error && r.status === 0;
}

// Reads stdin asynchronously; sync reads of a piped fd 0 can throw EAGAIN on Windows.
export async function readStdin(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  return data;
}
