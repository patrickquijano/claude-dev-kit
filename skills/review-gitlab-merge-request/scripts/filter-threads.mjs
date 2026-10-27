// Thread triage for review-gitlab-merge-request: which open threads to judge, and which the reviewer may resolve.
// Reads one discussions JSON file (REST array or MCP response) and prints JSON on stdout. CLI: `filter --file <json> --author <username> --self <username> --head <sha>`.
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
const list = (v) => (Array.isArray(v) ? v : (v?.nodes ?? []));

// Accepts the REST discussions array, the MCP merge request response, or a bare `nodes` object.
export function discussionNodes(json) {
  if (Array.isArray(json)) return json;
  const found = json?.discussions ?? json?.nodes;
  const nodes = Array.isArray(found) ? found : found?.nodes;
  if (!Array.isArray(nodes)) throw new Error('no discussions in the input');
  return nodes;
}

// The head SHA a note was written against; undefined when the payload carries none.
export function noteHead(note) {
  const p = note?.position;
  return p?.head_sha ?? p?.headSha ?? p?.diffRefs?.headSha ?? p?.diff_refs?.head_sha;
}

// A thread is judged when the MR author spoke last, the last note predates the head, or its opener answered an author reply.
export function classifyThreads({ nodes, author, self, head }) {
  const judged = [];
  const unjudged = [];
  for (const t of nodes) {
    if (!t.resolvable || t.resolved) continue;
    const notes = list(t.notes).filter((n) => !n.system);
    if (notes.length === 0) continue;
    const last = notes[notes.length - 1];
    const opener = notes[0].author?.username;
    const lastLogin = last.author?.username;
    const authorRepliedBefore = notes.slice(1, -1).some((n) => same(n.author?.username, author));
    const isJudged =
      same(lastLogin, author) || (noteHead(last) ?? head) !== head || (same(lastLogin, opener) && authorRepliedBefore);
    if (!isJudged) {
      unjudged.push(t.id);
      continue;
    }
    const pos = notes[0].position;
    judged.push({
      id: t.id,
      path: pos?.new_path ?? pos?.newPath ?? null,
      line: pos?.new_line ?? pos?.newLine ?? null,
      opener: opener ?? null,
      resolvable: same(opener, author) || same(opener, self)
    });
  }
  return { judged, unjudged, truncated: nodes.length >= PAGE };
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
    d.error('usage: filter-threads.mjs filter --file <json> --author <username> --self <username> --head <sha>');
    return 2;
  }
  const nodes = discussionNodes(JSON.parse(d.readFileSync(file, 'utf8')));
  d.log(JSON.stringify({ ok: true, ...classifyThreads({ nodes, author, self, head }) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'filter-threads');
