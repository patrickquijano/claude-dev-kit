// PR reference parser for address-github-pull-request-review: a GitHub PR URL, `owner/repo#N`, or a bare number plus `--remote <origin url>`.
// CLI: `parse-pr-ref.mjs <ref> [--remote <url>]`; JSON on stdout: `{owner,repo,number}` and exit 0, or `{error}` and exit 1.
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

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const NUMBER = /^[1-9]\d{0,8}$/;

const bad = (error) => ({ ok: false, error });

function build(owner, repo, number) {
  if (!OWNER.test(owner ?? '') || owner.endsWith('-')) return bad(`invalid owner: ${owner}`);
  if (!REPO.test(repo ?? '') || repo === '.' || repo === '..') return bad(`invalid repo: ${repo}`);
  if (!NUMBER.test(number ?? '')) return bad(`invalid pull request number: ${number}`);
  return { ok: true, owner, repo, number: Number(number) };
}

// Owner and repo of a github.com origin URL (scp-like, ssh, or https); anything else is an error.
export function parseRemote(remote) {
  const text = String(remote ?? '').trim();
  const m =
    /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(text) ??
    /^(?:ssh:\/\/git@|https:\/\/)github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(text);
  return m ? { ok: true, owner: m[1], repo: m[2] } : bad(`not a github.com remote: ${text}`);
}

export function parsePrRef(ref, remote) {
  const text = String(ref ?? '').trim();
  if (!text) return bad('missing pull request reference');
  const url = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/([^/\s]+)\/?$/.exec(text);
  if (url) return build(url[1], url[2], url[3]);
  const short = /^([^/\s#]+)\/([^/\s#]+)#(\S+)$/.exec(text);
  if (short) return build(short[1], short[2], short[3]);
  if (/^\d+$/.test(text)) {
    if (remote === undefined) return bad('a bare number needs --remote <origin url>');
    const r = parseRemote(remote);
    return r.ok ? build(r.owner, r.repo, text) : r;
  }
  return bad(`unrecognized pull request reference: ${text}`);
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

const realDeps = {
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const ref = argv[0];
  if (!ref || ref.startsWith('--')) {
    d.error('usage: parse-pr-ref.mjs <pr-url | owner/repo#N | number> [--remote <origin url>]');
    return 2;
  }
  const res = parsePrRef(ref, arg(argv, '--remote'));
  if (res.ok) {
    const { owner, repo, number } = res;
    d.log(JSON.stringify({ owner, repo, number }));
    return 0;
  }
  d.log(JSON.stringify({ error: res.error }));
  return 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'parse-pr-ref');
