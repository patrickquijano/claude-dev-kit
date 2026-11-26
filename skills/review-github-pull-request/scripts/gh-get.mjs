// Read-only GitHub GET for review-github-pull-request: checks one endpoint against fixed shapes, then runs `gh api <endpoint>` with the flags fixed for that shape.
// CLI: `gh-get.mjs <endpoint>` or `gh-get.mjs graphql <query-name> <owner> <repo> <n>` prints the response body; exit 0 = ok, 1 = gh failed, 2 = bad arguments (nothing runs).
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
  { re: /^user$/, flags: [] },
  { re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/issues\/\d+\/comments$/, flags: ['--paginate'] },
  {
    re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/contents\/[\w@+./-]+\?ref=[0-9a-f]{40}$/,
    flags: ['-H', 'Accept: application/vnd.github.raw']
  },
  {
    re: /^repos\/[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+\/compare\/[0-9a-f]{40}\.\.\.[0-9a-f]{40}$/,
    flags: ['-H', 'Accept: application/vnd.github.diff']
  }
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

// Fixed read-only GraphQL queries by name; a caller picks a name and never supplies query text, so a mutation cannot be sent.
export const QUERIES = Object.freeze({
  'review-threads':
    'query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved isOutdated resolvedBy{login} viewerCanResolve path line comments(first:5){nodes{author{login} body url createdAt}} lastComment: comments(last:1){nodes{databaseId author{login} body createdAt originalCommit{oid}}}}}}}}'
});

// `gh api graphql` arguments for `<query-name> <owner> <repo> <n>`, or undefined when the name or any value is invalid.
function graphqlArgs(argv) {
  if (argv.length !== 4) return;
  const [name, owner, repo, n] = argv;
  if (typeof name !== 'string' || !Object.hasOwn(QUERIES, name)) return;
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(owner) ||
    !/^[\w.-]+$/.test(repo) ||
    repo === '.' ||
    repo === '..' ||
    !/^[1-9]\d{0,9}$/.test(n)
  )
    return;
  return ['api', 'graphql', '-f', `query=${QUERIES[name]}`, '-f', `o=${owner}`, '-f', `r=${repo}`, '-F', `n=${n}`];
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
  const isGraphql = argv[0] === 'graphql';
  const shape = !isGraphql && argv.length === 1 ? shapeOf(argv[0]) : undefined;
  const gqlArgs = isGraphql ? graphqlArgs(argv.slice(1)) : undefined;
  if (!shape && !gqlArgs) {
    d.error(
      'usage: gh-get.mjs <endpoint> | graphql <query-name> <owner> <repo> <n> (read-only requests this skill uses)'
    );
    return 2;
  }
  const res = d.run(gqlArgs ?? ['api', argv[0], ...shape.flags]);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `gh exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'gh-get');
