// Read-only GitHub GET for create-github-release: checks one endpoint against fixed shapes, then runs `gh api <endpoint>`; no Accept header, so every response is JSON.
// CLI: `gh-get.mjs <endpoint>` prints the response body; exit 0 = ok, 1 = gh failed, 2 = bad arguments (nothing runs).
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
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

const SHAPES = [
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/compare\/\w[\w/.-]*\.\.\.\w[\w/.-]*$/, flags: [] },
  {
    re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/contents\/[\w@+./-]+\?ref=\w[\w/.-]*$/,
    flags: []
  },
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/immutable-releases$/, flags: [] },
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/releases\/tags\/\w[\w/.-]*$/, flags: [] },
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/releases\/\d+$/, flags: [] },
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/releases\?per_page=\d+$/, flags: [] }
];

// The shape matching `endpoint`, or undefined; a `..` (outside the one `...` of compare), a `.` segment, or an encoded dot is rejected.
function shapeOf(endpoint) {
  if (typeof endpoint !== 'string' || /%2e/i.test(endpoint)) return;
  if (endpoint.replace(/(?<!\.)\.{3}(?!\.)/, '/').includes('..')) return;
  if (endpoint.split('?')[0].split('/').includes('.')) return;
  if (/\/(?:\/|\?|$)/.test(endpoint)) return;
  return SHAPES.find((s) => s.re.test(endpoint));
}

// True when `endpoint` matches one of the read-only shapes.
export function isAllowed(endpoint) {
  return shapeOf(endpoint) !== undefined;
}

const realDeps = {
  run: (args) => {
    const res = spawnSync('gh', args, { encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    if (res.error) throw res.error;
    return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  },
  write: (text) => process.stdout.write(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const shape = argv.length === 1 ? shapeOf(argv[0]) : undefined;
  if (!shape) {
    d.error('usage: gh-get.mjs <endpoint> (one read-only endpoint this skill uses)');
    return 2;
  }
  const res = d.run(['api', argv[0], ...shape.flags]);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `gh exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'gh-get');
