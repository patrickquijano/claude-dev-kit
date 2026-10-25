// Thread triage for review-github-pull-request: which open threads to judge, and which the reviewer may resolve.
// Reads one `review-threads` JSON file and prints JSON on stdout. CLI: `filter --file <json> --author <login> --self <login> --head <sha>`.
import { readFileSync, realpathSync } from 'node:fs';
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

const PAGE = 100;
const same = (a, b) => Boolean(a) && Boolean(b) && String(a).toLowerCase() === String(b).toLowerCase();

// Accepts the raw GraphQL response or a bare `nodes` array.
export function threadNodes(json) {
  if (Array.isArray(json)) return json;
  const nodes = json?.data?.repository?.pullRequest?.reviewThreads?.nodes ?? json?.nodes;
  if (!Array.isArray(nodes)) throw new Error('no reviewThreads nodes in the input');
  return nodes;
}

// A thread is judged when the PR author spoke last, the comment predates the head, it is outdated, or its opener answered an author reply.
export function classifyThreads({ nodes, author, self, head }) {
  const judged = [];
  const unjudged = [];
  const unresolvable = [];
  for (const t of nodes) {
    if (t.isResolved) continue;
    if (!t.viewerCanResolve) {
      unresolvable.push(t.id);
      continue;
    }
    const comments = t.comments?.nodes ?? [];
    const last = t.lastComment?.nodes?.[0] ?? comments[comments.length - 1];
    const opener = comments[0]?.author?.login;
    const lastLogin = last?.author?.login;
    const authorRepliedBefore = comments.slice(1, -1).some((c) => same(c.author?.login, author));
    const isJudged =
      same(lastLogin, author) ||
      Boolean(t.isOutdated) ||
      (last?.originalCommit?.oid ?? head) !== head ||
      (same(lastLogin, opener) && authorRepliedBefore);
    if (!isJudged) {
      unjudged.push(t.id);
      continue;
    }
    judged.push({
      id: t.id,
      path: t.path ?? null,
      line: t.line ?? null,
      opener: opener ?? null,
      resolvable: same(opener, author) || same(opener, self)
    });
  }
  return { judged, unjudged, unresolvable, truncated: nodes.length >= PAGE };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  readFileSync,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const [file, author, self, head] = ['--file', '--author', '--self', '--head'].map((n) => arg(argv, n));
  if (argv[0] !== 'filter' || !file || !author || !self || !head) {
    d.error('usage: filter-threads.mjs filter --file <json> --author <login> --self <login> --head <sha>');
    return 2;
  }
  const nodes = threadNodes(JSON.parse(d.readFileSync(file, 'utf8')));
  d.log(JSON.stringify({ ok: true, ...classifyThreads({ nodes, author, self, head }) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'filter-threads');
