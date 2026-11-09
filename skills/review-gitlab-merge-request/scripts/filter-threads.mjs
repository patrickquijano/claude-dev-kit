// Thread triage for review-gitlab-merge-request: which own open threads to judge.
// Reads one discussions JSON file (REST array or MCP response) and prints JSON on stdout. CLI: `filter --file <json> --author <username> --self <username> --head <sha> --marker <text>`.
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

const GATING = new Set(['critical', 'major', 'minor']);
const SEVERITY = /^\s*\[(critical|major|minor|nit|question)\]/;

// The severity a note body starts with, or null when it has no valid prefix.
export function parseSeverity(body) {
  return SEVERITY.exec(String(body ?? ''))?.[1] ?? null;
}

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

// Own threads only: opened by self with the marker. An own gating thread is judged when the MR author spoke last, the last note predates the head, self answered an author reply, or someone but self resolved it.
export function classifyThreads({ nodes, author, self, head, marker }) {
  const judged = [];
  const unjudged = [];
  const nongating = [];
  let ignored = 0;
  for (const t of nodes) {
    const all = list(t.notes);
    // REST discussions carry the flags on their notes; the MCP shape carries them on the thread.
    const resolvable = t.resolvable ?? all.some((n) => n.resolvable);
    const resolved = t.resolved ?? all.filter((n) => n.resolvable).every((n) => n.resolved);
    if (!resolvable) continue;
    const notes = all.filter((n) => !n.system);
    if (notes.length === 0) continue;
    const severity = parseSeverity(notes[0].body);
    const own = same(notes[0].author?.username, self) && String(notes[0].body ?? '').includes(marker) && severity;
    // An own gating discussion resolved by anyone but self (or by an unknown user) still counts as unresolved.
    const resolver =
      t.resolved_by ??
      t.resolvedBy ??
      all
        .map((n) => n.resolved_by)
        .filter(Boolean)
        .pop();
    const reopened = resolved && own && GATING.has(severity) && !same(resolver?.username, self);
    if (resolved && !reopened) continue;
    if (!own) {
      ignored += 1;
      continue;
    }
    if (!GATING.has(severity)) {
      nongating.push(t.id);
      continue;
    }
    const last = notes[notes.length - 1];
    const lastLogin = last.author?.username;
    const authorRepliedBefore = notes.slice(1, -1).some((n) => same(n.author?.username, author));
    const authorLast = same(lastLogin, author);
    const isJudged =
      reopened || authorLast || (noteHead(last) ?? head) !== head || (same(lastLogin, self) && authorRepliedBefore);
    if (!isJudged) {
      unjudged.push(t.id);
      continue;
    }
    const pos = notes[0].position;
    judged.push({
      id: t.id,
      path: pos?.new_path ?? pos?.newPath ?? null,
      line: pos?.new_line ?? pos?.newLine ?? null,
      severity,
      authorLast
    });
  }
  return { judged, unjudged, nongating, ignored, truncated: nodes.length >= PAGE };
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
      'usage: filter-threads.mjs filter --file <json> --author <username> --self <username> --head <sha> --marker <text>'
    );
    return 2;
  }
  const nodes = discussionNodes(JSON.parse(d.readFileSync(file, 'utf8')));
  d.log(JSON.stringify({ ok: true, ...classifyThreads({ nodes, author, self, head, marker }) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'filter-threads');
