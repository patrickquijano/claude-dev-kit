// Merges the Husky `prepare` target into an existing `scripts.prepare` value for setup-husky; reads a file only through `deps` when given a path.
// CLI: `--pkg <pkg> [--existing <script> | --existing-file <abs path> | --package-json <abs path>]` (`<pkg>` is `.` at the git root; exit 2 = bad arguments), JSON on stdout. The file forms keep the script out of a shell argument.
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaults = {
  log: (line) => console.log(line),
  error: (line) => console.error(line),
  readFile: (path) => readFileSync(path, 'utf8')
};

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

const split = (script) =>
  String(script ?? '')
    .split('&&')
    .map((s) => s.trim())
    .filter(Boolean);
const isHusky = (segment) => segment === 'husky' || segment.startsWith('husky ');

// `husky` at the git root, else `cd <path up to the root> && husky <pkg>/.husky`.
export function target(pkg) {
  const clean = String(pkg ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\/|\/$/g, '');
  if (!clean || clean === '.') return 'husky';
  const up = clean.split('/').map(() => '..');
  return `cd ${up.join('/')} && husky ${clean}/.husky`;
}

// Keeps existing commands first; returns `{ prepare, action }` with action `set`, `unchanged`, `replaced`, or `merged`.
export function mergePrepare({ pkg, existing } = {}) {
  const want = target(pkg);
  const wantSegments = split(want);
  const segments = split(existing);
  if (segments.length === 0) return { prepare: want, action: 'set' };

  for (let i = 0; i + wantSegments.length <= segments.length; i++) {
    if (wantSegments.every((s, j) => segments[i + j] === s)) {
      return { prepare: segments.join(' && '), action: 'unchanged' };
    }
  }

  const at = segments.findIndex(isHusky);
  if (at === -1) return { prepare: [...segments, want].join(' && '), action: 'merged' };
  const from = at > 0 && /^cd\s/.test(segments[at - 1]) ? at - 1 : at;
  const next = [...segments.slice(0, from), want, ...segments.slice(at + 1)];
  return { prepare: next.join(' && '), action: 'replaced' };
}

// `scripts.prepare` of a `package.json` text; undefined when absent or not a string, a SyntaxError when the JSON is invalid.
export function readPrepare(text) {
  const prepare = JSON.parse(text)?.scripts?.prepare;
  return typeof prepare === 'string' ? prepare : undefined;
}

const SOURCES = { '--existing': 'existing', '--existing-file': 'existingFile', '--package-json': 'packageJson' };

// A bad command line; `main` reports it and exits 2, while any other error propagates.
class UsageError extends Error {}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const isPkg = argv[i] === '--pkg';
    if (!isPkg && !Object.hasOwn(SOURCES, argv[i])) throw new UsageError(`unknown argument ${argv[i]}`);
    if (i + 1 >= argv.length) throw new UsageError(`${argv[i]} needs a value`);
    if (isPkg) out.pkg = argv[i + 1];
    else out[SOURCES[argv[i]]] = argv[i + 1];
  }
  if (out.pkg === undefined) throw new UsageError('--pkg is required');
  if (Object.values(SOURCES).filter((key) => out[key] !== undefined).length > 1) {
    throw new UsageError('use only one of --existing, --existing-file, --package-json');
  }
  for (const key of ['existingFile', 'packageJson']) {
    if (out[key] === undefined) continue;
    if (out[key].split(/[\\/]/).includes('..')) throw new UsageError(`${key} must not contain a .. segment`);
    if (!isAbsolute(out[key])) throw new UsageError(`${key} must be an absolute path`);
  }
  if (out.packageJson !== undefined && !/[\\/]package\.json$/.test(out.packageJson)) {
    throw new UsageError('--package-json must end in /package.json');
  }
  return out;
}

export function main(argv = process.argv.slice(2), deps = {}) {
  const d = { ...defaults, ...deps };
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    d.error(`merge-prepare: ${err.message}`);
    return 2;
  }
  let existing = args.existing;
  if (args.existingFile !== undefined) existing = d.readFile(args.existingFile);
  if (args.packageJson !== undefined) existing = readPrepare(d.readFile(args.packageJson));
  d.log(JSON.stringify(mergePrepare({ pkg: args.pkg, existing })));
  return 0;
}

await runIfMain(import.meta.url, () => main(), 'merge-prepare');
