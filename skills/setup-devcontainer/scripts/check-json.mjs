// JSON syntax check for setup-devcontainer; the file is read here and never embedded in a command.
// CLI: `check-json.mjs <absolute path>` prints nothing when the file parses as JSON; exit 0 = valid, 1 = invalid or unreadable, 2 = bad arguments, a path outside CLAUDE_PROJECT_DIR (default: cwd), or a missing project directory.
import { readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
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

const PATH_OK = /^[A-Za-z0-9._/-]+$/;

// True for an absolute path of safe characters with no `..` segment.
export function isSafePath(path) {
  return path.startsWith('/') && PATH_OK.test(path) && !path.split('/').includes('..');
}

// True when `target` is strictly inside `root`.
export const isInside = (root, target) => {
  const rel = relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
};

const realDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  realpath: (path) => realpathSync(path),
  env: process.env,
  cwd: () => process.cwd(),
  error: (text) => console.error(text)
};

// Real path of `path`; a missing path resolves its parent and keeps its name so the read reports it, any other error rethrows.
function resolveReal(d, path) {
  try {
    return d.realpath(path);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    const parent = dirname(path);
    return parent === path ? path : join(resolveReal(d, parent), basename(path));
  }
}

// CLI body; returns the exit code. A parse failure reports only the path, never the file contents.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 1 || !isSafePath(argv[0])) {
    d.error('usage: check-json.mjs <absolute path matching ^[A-Za-z0-9._/-]+$ with no .. segment>');
    return 2;
  }
  let root;
  try {
    root = d.realpath(d.env.CLAUDE_PROJECT_DIR ?? d.cwd());
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    d.error('check-json: project directory not found');
    return 2;
  }
  const target = resolveReal(d, argv[0]);
  if (!isInside(root, target)) {
    d.error('check-json: path resolves outside the project directory');
    return 2;
  }
  try {
    JSON.parse(d.readFile(target));
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    d.error(`check-json: ${argv[0]} is not valid JSON`);
    return 1;
  }
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-json');
