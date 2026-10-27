// Tag diff for push-tags: local tags vs a remote's tags, by the commit each points to.
// CLI: `tag-diff.mjs <root> <remote>` prints JSON; exit 0 = diff, 1 = remote-error, 2 = bad arguments. Reads refs only; the remote is contacted by `git ls-remote`.
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

const fail = (code, message) => ({ ok: false, code, message });
const REF = /^([0-9a-f]{40,64})\s+refs\/tags\/(.+?)(\^\{\})?$/;

// Map of tag name → commit sha from `<sha> refs/tags/<name>[^{}]` lines; a peeled `^{}` sha wins over the tag-object sha.
export function parseRefs(text) {
  const tags = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = REF.exec(line.trim());
    if (!m) continue;
    if (m[3] || !tags.has(m[2])) tags.set(m[2], m[1]);
  }
  return tags;
}

// `unpushed` (absent on the remote, sorted), `mismatches` (same name, different commit), and the remote tag names.
export function diffTags(local, remote) {
  const unpushed = [];
  const mismatches = [];
  for (const [tag, commit] of local) {
    if (!remote.has(tag)) unpushed.push({ tag, commit });
    else if (remote.get(tag) !== commit) mismatches.push({ tag, local: commit, remote: remote.get(tag) });
  }
  const byTag = (a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0);
  return { unpushed: unpushed.sort(byTag), mismatches: mismatches.sort(byTag), remoteTags: [...remote.keys()].sort() };
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

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 2 || !argv[0] || !argv[1]) {
    d.error('usage: tag-diff.mjs <root> <remote>');
    return 2;
  }
  const [root, remote] = argv;
  const gitFail = (res) =>
    d.log(
      JSON.stringify(
        fail('remote-error', (res.stderr.split('\n').find((l) => l.trim()) ?? `git exited ${res.status}`).trim())
      )
    );
  const localRes = d.run(['-C', root, 'show-ref', '--tags', '--dereference']);
  // Exit 1 with no output means the repository has no tags.
  if (localRes.status !== 0 && !(localRes.status === 1 && !localRes.stdout.trim())) {
    gitFail(localRes);
    return 1;
  }
  const remoteRes = d.run(['-C', root, 'ls-remote', '--tags', remote]);
  if (remoteRes.status !== 0) {
    gitFail(remoteRes);
    return 1;
  }
  const result = diffTags(parseRefs(localRes.stdout), parseRefs(remoteRes.stdout));
  d.log(JSON.stringify({ ok: true, ...result }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'tag-diff');
