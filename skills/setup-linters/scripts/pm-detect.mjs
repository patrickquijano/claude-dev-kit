// Package-dir and manager detector for setup-linters: resolves the npm package dir, its manager, and the name for a missing package.json.
// Read-only. CLI: `pm-detect.mjs --root <abs git root> [--cwd <abs dir>]`, JSON on stdout.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
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

const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm']
];

// Package name for a missing package.json: lowercase dir name, runs of other characters to `-`, leading `.`, `_`, `-` trimmed, empty -> `project`.
export function sanitizeName(dirName) {
  const name = String(dirName)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+/, '');
  return name || 'project';
}

// Manager name from a `packageManager` field (`pnpm@9.1.0+sha...` -> `pnpm`), or undefined when unrecognized.
export function managerFromField(field) {
  const name = typeof field === 'string' ? field.split('@')[0] : '';
  return ['npm', 'pnpm', 'yarn', 'bun'].includes(name) ? name : undefined;
}

function readJson(file, deps) {
  if (!deps.existsSync(file)) return undefined;
  try {
    return JSON.parse(deps.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) return undefined;
    throw err;
  }
}

// Package dir: the root for a workspace root, else the nearest dir with a package.json from cwd up to root, else the root.
function packageDir(root, cwd, deps) {
  const rootJson = readJson(path.join(root, 'package.json'), deps);
  if (rootJson?.workspaces || deps.existsSync(path.join(root, 'pnpm-workspace.yaml'))) return root;
  for (let dir = cwd; ; dir = path.dirname(dir)) {
    if (deps.existsSync(path.join(dir, 'package.json'))) return dir;
    if (dir === root || dir === path.dirname(dir)) return root;
  }
}

function lockfilesIn(dir, deps) {
  return LOCKFILES.filter(([file]) => deps.existsSync(path.join(dir, file)));
}

// Detects the package dir and manager; several managers' lockfiles in one dir -> manager `unknown`.
export function detectPackage(root, cwd, deps) {
  const dir = packageDir(root, cwd, deps);
  const pkgJson = readJson(path.join(dir, 'package.json'), deps);
  const result = {
    dir,
    pkg: path.relative(root, dir) || '.',
    packageJson: deps.existsSync(path.join(dir, 'package.json')),
    lockfiles: []
  };
  if (!result.packageJson) result.name = sanitizeName(path.basename(dir));
  const fromField = managerFromField(pkgJson?.packageManager);
  if (fromField) return { ...result, manager: fromField, source: 'packageManager' };
  for (const where of new Set([dir, root])) {
    const found = lockfilesIn(where, deps);
    if (found.length === 0) continue;
    const managers = [...new Set(found.map(([, pm]) => pm))];
    const lockfiles = found.map(([file]) => file);
    return managers.length === 1
      ? { ...result, manager: managers[0], source: 'lockfile', lockfiles }
      : { ...result, manager: 'unknown', source: 'lockfile', lockfiles };
  }
  return { ...result, manager: 'npm', source: 'default' };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  existsSync,
  readFileSync,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const root = arg(argv, '--root');
  const cwd = arg(argv, '--cwd') ?? root;
  if (!root || !path.isAbsolute(root) || !path.isAbsolute(cwd)) {
    d.error('usage: pm-detect.mjs --root <absolute git root> [--cwd <absolute dir>]');
    return 2;
  }
  const rel = path.relative(root, cwd);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    d.error('usage: pm-detect.mjs --cwd must be inside --root');
    return 2;
  }
  d.log(JSON.stringify({ ok: true, errors: [], ...detectPackage(path.resolve(root), path.resolve(cwd), d) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'pm-detect');
