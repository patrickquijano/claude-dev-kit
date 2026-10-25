// Merges the Husky `prepare` target into an existing `scripts.prepare` value for setup-husky; pure, no file access.
// CLI: `--pkg <pkg> [--existing <script>]` (`<pkg>` is `.` at the git root), JSON on stdout.
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const defaults = { log: (line) => console.log(line) };

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

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--pkg') out.pkg = argv[i + 1];
    else if (argv[i] === '--existing') out.existing = argv[i + 1];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (out.pkg === undefined) throw new Error('--pkg is required');
  return out;
}

export function main(argv = process.argv.slice(2), deps = defaults) {
  deps.log(JSON.stringify(mergePrepare(parseArgs(argv))));
  return 0;
}

await runIfMain(import.meta.url, () => main(), 'merge-prepare');
