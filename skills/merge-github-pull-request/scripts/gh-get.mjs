// Read-only GitHub GET for merge-github-pull-request: checks one endpoint and jq filter against fixed pairs, then runs `gh api <endpoint> [--jq <expr>]`.
// CLI: `gh-get.mjs <endpoint> [--jq <expr>]` prints the response; exit 0 = ok, 1 = gh failed, 2 = bad arguments (nothing runs).
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

const OWNER = '[A-Za-z0-9][A-Za-z0-9_-]*';
const REPO = '[\\w.-]+';
const REF = '\\w[\\w/.+-]*';

// Each shape allows one endpoint form with exactly one jq filter (undefined = no `--jq`).
const SHAPES = [
  { re: /^user$/, jq: '.login' },
  { re: new RegExp(`^repos/${OWNER}/${REPO}/rules/branches/${REF}$`), jq: undefined },
  { re: new RegExp(`^repos/${OWNER}/${REPO}/commits/[0-9a-fA-F]{7,40}$`), jq: '.parents | length' },
  { re: new RegExp(`^repos/${OWNER}/${REPO}/branches/${REF}$`), jq: undefined }
];

// The shape matching `endpoint`, or undefined; a `..`, a `.` segment, or an encoded dot is rejected.
function shapeOf(endpoint) {
  if (typeof endpoint !== 'string' || /%2e/i.test(endpoint)) return;
  if (endpoint.includes('..')) return;
  if (endpoint.split('/').includes('.')) return;
  if (/\/(?:\/|$)/.test(endpoint)) return;
  return SHAPES.find((s) => s.re.test(endpoint));
}

// True when `endpoint` with `jq` (undefined = none) is one of the read-only pairs.
export function isAllowed(endpoint, jq) {
  const shape = shapeOf(endpoint);
  return shape !== undefined && shape.jq === jq;
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

// Splits argv into the endpoint and the jq filter; undefined for any other form.
function parse(argv) {
  if (argv.length === 1) return { endpoint: argv[0], jq: undefined };
  if (argv.length === 3 && argv[1] === '--jq') return { endpoint: argv[0], jq: argv[2] };
}

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const parsed = parse(argv);
  if (!parsed || !isAllowed(parsed.endpoint, parsed.jq)) {
    d.error('usage: gh-get.mjs <endpoint> [--jq <expr>] (one read-only endpoint and filter this skill uses)');
    return 2;
  }
  const args = ['api', parsed.endpoint];
  if (parsed.jq !== undefined) args.push('--jq', parsed.jq);
  const res = d.run(args);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `gh exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'gh-get');
