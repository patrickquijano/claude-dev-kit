// Conventional Commits title check for open-github-pull-request: `type(scope)!: description`, 11 types, lowercase start, no trailing period, at most 72 chars.
// CLI: `check-title.mjs "<title>"`; JSON on stdout: `{ok:true}` and exit 0, or `{ok:false,errors:[…]}` and exit 1.
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

const MAX_LENGTH = 72;
const TYPES = new Set(['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']);
const SCOPE = /^\([a-z0-9._/-]+\)$/;

// True when `prefix` (the text before `: `) is a known type, then an optional `(scope)` and an optional `!`.
function prefixOk(prefix) {
  const bare = prefix.endsWith('!') ? prefix.slice(0, -1) : prefix;
  const paren = bare.indexOf('(');
  if (paren < 0) return TYPES.has(bare);
  return TYPES.has(bare.slice(0, paren)) && SCOPE.test(bare.slice(paren));
}

// Reasons `title` is not a valid PR title; an empty list means valid.
export function titleErrors(title) {
  const text = String(title ?? '');
  const errors = [];
  if (text.length > MAX_LENGTH) errors.push(`longer than ${MAX_LENGTH} chars (${text.length})`);
  const colon = text.indexOf(': ');
  const description = colon < 0 ? '' : text.slice(colon + 2);
  if (colon < 0 || !prefixOk(text.slice(0, colon)) || !description.trim()) {
    errors.push('not `type(scope)!: description` with a known type and a lowercase scope');
    return errors;
  }
  if (/^[A-Z]/.test(description)) errors.push('description must start lowercase');
  if (description.endsWith('.')) errors.push('description must not end with a period');
  if (description !== description.trim()) errors.push('description has leading or trailing spaces');
  return errors;
}

const realDeps = {
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const title = argv[0];
  if (title === undefined) {
    d.error('usage: check-title.mjs "<title>"');
    return 2;
  }
  const errors = titleErrors(title);
  if (errors.length === 0) {
    d.log(JSON.stringify({ ok: true }));
    return 0;
  }
  d.log(JSON.stringify({ ok: false, errors }));
  return 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-title');
