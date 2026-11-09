// Thread triage for review-github-pull-request: which own open threads to judge.
// Reads one `review-threads` JSON file and prints JSON on stdout. CLI: `filter --file <json> --author <login> --self <login> --head <sha> --marker <text>`.
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

const GATING = new Set(['critical', 'major', 'minor']);
const SEVERITY = /^\s*\[(critical|major|minor|nit|question)\]/;

// The severity a comment body starts with, or null when it has no valid prefix.
export function parseSeverity(body) {
  return SEVERITY.exec(String(body ?? ''))?.[1] ?? null;
}

// Own threads only: opened by self with the marker. A resolved own gating thread is judged unless self resolved it; an open one is judged when the PR author spoke last, the comment predates the head, it is outdated, or self answered an author reply.
export function classifyThreads({ nodes, author, self, head, marker }) {
  const judged = [];
  const unjudged = [];
  const unresolvable = [];
  const nongating = [];
  let ignored = 0;
  for (const t of nodes) {
    const resolved = Boolean(t.isResolved);
    if (resolved && same(t.resolvedBy?.login, self)) continue;
    const comments = t.comments?.nodes ?? [];
    const first = comments[0];
    const severity = parseSeverity(first?.body);
    if (!same(first?.author?.login, self) || !String(first?.body ?? '').includes(marker) || !severity) {
      if (!resolved) ignored += 1;
      continue;
    }
    if (!GATING.has(severity)) {
      if (!resolved) nongating.push(t.id);
      continue;
    }
    if (!resolved && !t.viewerCanResolve) {
      unresolvable.push(t.id);
      continue;
    }
    const last = t.lastComment?.nodes?.[0] ?? comments[comments.length - 1];
    const lastLogin = last?.author?.login;
    const authorRepliedBefore = comments.slice(1, -1).some((c) => same(c.author?.login, author));
    const authorLast = same(lastLogin, author);
    const isJudged =
      resolved ||
      authorLast ||
      Boolean(t.isOutdated) ||
      (last?.originalCommit?.oid ?? head) !== head ||
      (same(lastLogin, self) && authorRepliedBefore);
    if (!isJudged) {
      unjudged.push(t.id);
      continue;
    }
    judged.push({ id: t.id, path: t.path ?? null, line: t.line ?? null, severity, authorLast });
  }
  return { judged, unjudged, unresolvable, nongating, ignored, truncated: nodes.length >= PAGE };
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
  const [file, author, self, head, marker] = ['--file', '--author', '--self', '--head', '--marker'].map((n) =>
    arg(argv, n)
  );
  if (argv[0] !== 'filter' || !file || !author || !self || !head || !marker) {
    d.error(
      'usage: filter-threads.mjs filter --file <json> --author <login> --self <login> --head <sha> --marker <text>'
    );
    return 2;
  }
  const nodes = threadNodes(JSON.parse(d.readFileSync(file, 'utf8')));
  d.log(JSON.stringify({ ok: true, ...classifyThreads({ nodes, author, self, head, marker }) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'filter-threads');
