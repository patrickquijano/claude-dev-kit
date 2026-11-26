// Read-only GitHub GET for address-github-pull-request-review: checks one endpoint against fixed shapes, then runs `gh api <endpoint>`.
// CLI: `gh-get.mjs <endpoint>` or `gh-get.mjs graphql <query-name> <owner> <repo> <n> [<cursor>]` prints the response body; exit 0 = ok, 1 = gh failed, 2 = bad arguments (nothing runs).
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

const SHAPES = [{ re: /^user$/, flags: [] }];

// The shape matching `endpoint`, or undefined; a `..` or an encoded dot is rejected.
function shapeOf(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.includes('..') || /%2e/i.test(endpoint)) return;
  return SHAPES.find((s) => s.re.test(endpoint));
}

// True when `endpoint` matches one of the read-only shapes.
export function isAllowed(endpoint) {
  return shapeOf(endpoint) !== undefined;
}

// Fixed read-only GraphQL queries by name; every one is a `query`, so a mutation cannot be sent.
export const QUERIES = Object.freeze({
  'pr-files':
    'query($o:String!,$r:String!,$n:Int!,$c:String){repository(owner:$o,name:$r){pullRequest(number:$n){files(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{path}}}}}',
  'review-threads':
    'query($o:String!,$r:String!,$n:Int!,$c:String){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id isResolved isOutdated path line comments(first:20){nodes{databaseId author{login} authorAssociation body url createdAt}}}}}}}'
});

const OWNER_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const REPO_RE = /^[\w.-]+$/;
const NUMBER_RE = /^[1-9]\d{0,9}$/;
const CURSOR_RE = /^[A-Za-z0-9+/=_-]{1,200}$/;

// The `gh` argv for `graphql <query-name> <owner> <repo> <n> [<cursor>]`, or undefined when any input is invalid.
export function graphqlArgs(args) {
  const [name, owner, repo, n, cursor, ...extra] = args;
  if (typeof name !== 'string' || !Object.hasOwn(QUERIES, name) || extra.length > 0) return;
  if (![owner, repo, n].every((v) => typeof v === 'string')) return;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo) || repo === '.' || repo === '..' || !NUMBER_RE.test(n)) return;
  if (cursor !== undefined && (typeof cursor !== 'string' || !CURSOR_RE.test(cursor))) return;
  const argv = [
    'api',
    'graphql',
    '-f',
    `query=${QUERIES[name]}`,
    '-f',
    `o=${owner}`,
    '-f',
    `r=${repo}`,
    '-F',
    `n=${n}`
  ];
  if (cursor !== undefined) argv.push('-f', `c=${cursor}`);
  return argv;
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
  let ghArgs;
  if (argv[0] === 'graphql') {
    ghArgs = graphqlArgs(argv.slice(1));
  } else {
    const shape = argv.length === 1 ? shapeOf(argv[0]) : undefined;
    if (shape) ghArgs = ['api', argv[0], ...shape.flags];
  }
  if (!ghArgs) {
    d.error(
      'usage: gh-get.mjs <endpoint> | graphql <pr-files|review-threads> <owner> <repo> <n> [<cursor>] (read-only only)'
    );
    return 2;
  }
  const res = d.run(ghArgs);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `gh exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'gh-get');
