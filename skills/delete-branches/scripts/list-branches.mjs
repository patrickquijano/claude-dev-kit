// Candidate listing for delete-branches: local or remote-tracking branches minus the protected set, with descriptions and question pages.
// CLI: `list-branches.mjs <root> <local|remote> [<remote>] [--protected <name-or-glob>]…` prints JSON; exit 0 = listing, 1 = git-error, 2 = bad arguments. `<remote>` is required for `remote` and unused for `local`. Reads refs only.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_OPTIONS = 4;
const MAX_QUESTIONS = 4;
const SEP = '\x1f';
const FORMAT = [
  '%(refname)',
  '%(upstream:short)',
  '%(upstream:track)',
  '%(committerdate:short)',
  '%(contents:subject)'
].join('%1f');

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

const fail = (code, message) => ({ ok: false, code, message });

// Describes a local branch's upstream state from `%(upstream:short)` and `%(upstream:track)`.
export function parseTrack(upstream, track) {
  if (!upstream) return 'no upstream';
  const t = String(track ?? '').trim();
  if (t === '[gone]') return 'upstream gone';
  const m = /^\[(.+)\]$/.exec(t);
  return m ? m[1] : `in sync with ${upstream}`;
}

// True when `name` equals `pattern` or matches it as a glob; `*` matches any run of characters, `/` included.
function globMatch(name, pattern) {
  const [head, ...rest] = pattern.split('*');
  if (!rest.length) return name === pattern;
  const tail = rest.pop();
  if (!name.startsWith(head) || !name.slice(head.length).endsWith(tail)) return false;
  let at = head.length;
  const end = name.length - tail.length;
  for (const part of rest) {
    const found = name.indexOf(part, at);
    if (found < 0 || found + part.length > end) return false;
    at = found + part.length;
  }
  return at <= end;
}

// True when `name` matches any protected name or glob.
export function isProtected(name, patterns) {
  return patterns.some((p) => globMatch(name, p));
}

// Candidate pages: chunks of ≤4 options, never a lone 1-option chunk after a full one (4+1 → 3+2), grouped ≤4 questions per call.
// A single candidate gets a `Keep all` option so its question still has 2 options.
export function pageCandidates(candidates, label) {
  const names = candidates.map((c) => ({ label: c.name, description: c.description.slice(0, 120) }));
  if (names.length === 0) return [];
  if (names.length === 1) names.push({ label: 'Keep all', description: 'Delete nothing' });
  const sizes = [];
  for (let left = names.length; left > 0;) {
    const take = left === MAX_OPTIONS + 1 ? MAX_OPTIONS - 1 : Math.min(MAX_OPTIONS, left);
    sizes.push(take);
    left -= take;
  }
  const questions = [];
  let at = 0;
  sizes.forEach((size, i) => {
    questions.push({
      header: `${label} ${i + 1}/${sizes.length}`.slice(0, 12),
      question: `Which ${label.toLowerCase()} branches do you want to delete? (page ${i + 1} of ${sizes.length})`,
      multiSelect: true,
      options: names.slice(at, at + size)
    });
    at += size;
  });
  const calls = [];
  for (let i = 0; i < questions.length; i += MAX_QUESTIONS) calls.push(questions.slice(i, i + MAX_QUESTIONS));
  return calls;
}

// Parses `for-each-ref` lines into {name, description}; refs outside `prefix` and a remote `HEAD` are dropped.
export function parseRefLines(text, prefix, local) {
  const out = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!line) continue;
    const [ref, upstream, track, date, subject] = line.split(SEP);
    if (!ref?.startsWith(prefix)) continue;
    const name = ref.slice(prefix.length);
    if (!name || (!local && name === 'HEAD')) continue;
    const state = local ? `${parseTrack(upstream, track)}; ` : '';
    out.push({ name, description: `${state}${date ?? ''} ${subject ?? ''}`.trim() });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

const realDeps = {
  run: (args) => {
    const res = spawnSync('git', args, { encoding: 'utf8', timeout: 30_000 });
    if (res.error) throw res.error;
    return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// Splits argv into positionals and `--protected` values; null on any unknown flag or dangling `--protected`.
function parseArgs(argv) {
  const positional = [];
  const patterns = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protected') {
      if (i + 1 >= argv.length) return null;
      patterns.push(argv[++i]);
    } else if (argv[i].startsWith('-')) return null;
    else positional.push(argv[i]);
  }
  return { positional, patterns };
}

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const parsed = parseArgs(argv);
  const [root, kind, remote] = parsed?.positional ?? [];
  const valid =
    parsed &&
    root &&
    (kind === 'local' ? parsed.positional.length <= 3 : kind === 'remote' && remote && parsed.positional.length === 3);
  if (!valid) {
    d.error('usage: list-branches.mjs <root> <local|remote> [<remote>] [--protected <name-or-glob>]…');
    return 2;
  }
  const local = kind === 'local';
  const prefix = local ? 'refs/heads/' : `refs/remotes/${remote}/`;
  const res = d.run(['-C', root, 'for-each-ref', `--format=${FORMAT}`, prefix]);
  if (res.status !== 0) {
    d.log(
      JSON.stringify(
        fail('git-error', (res.stderr.split('\n').find((l) => l.trim()) ?? `git exited ${res.status}`).trim())
      )
    );
    return 1;
  }
  const candidates = [];
  const excluded = [];
  const skipped = [];
  for (const c of parseRefLines(res.stdout, prefix, local)) {
    if (/['\n]/.test(c.name)) skipped.push({ name: c.name, reason: "name contains ' or a newline" });
    else if (isProtected(c.name, parsed.patterns)) excluded.push(c.name);
    else candidates.push(c);
  }
  d.log(
    JSON.stringify({
      ok: true,
      candidates,
      excluded,
      skipped,
      pages: pageCandidates(candidates, local ? 'Local' : 'Remote')
    })
  );
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'list-branches');
