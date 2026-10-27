// MR reference parser for address-gitlab-merge-request-review: a GitLab MR URL, `<group/project>!<iid>`, `!<iid>`, or a bare IID plus `--remote <origin url>`.
// CLI: `parse-mr-ref.mjs <ref> [--remote <url>]`; JSON on stdout: `{host,project,iid}` and exit 0, or `{error}` and exit 1.
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

const HOST = /^[A-Za-z0-9.-]{1,253}$/;
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,254}$/;
const IID = /^[1-9]\d{0,8}$/;

const bad = (error) => ({ ok: false, error });

// A project path needs a group and a project; every segment is checked so `..` and `-` never pass.
function validPath(project) {
  const segments = String(project ?? '').split('/');
  return segments.length >= 2 && segments.every((s) => SEGMENT.test(s) && !s.endsWith('.git') && !s.endsWith('.'));
}

function build(host, project, iid) {
  if (
    !HOST.test(host ?? '') ||
    host.startsWith('.') ||
    host.startsWith('-') ||
    host.endsWith('-') ||
    host.endsWith('.')
  )
    return bad(`invalid host: ${host}`);
  if (host.toLowerCase() === 'github.com') return bad('not a GitLab host: github.com');
  if (!validPath(project)) return bad(`invalid project path: ${project}`);
  if (!IID.test(iid ?? '')) return bad(`invalid merge request IID: ${iid}`);
  return { ok: true, host, project, iid: Number(iid) };
}

// Host and project path of an origin URL (scp-like, ssh, or https); the port is dropped, a github.com host is an error.
export function parseRemote(remote) {
  const text = String(remote ?? '').trim();
  let host;
  let path;
  const scheme = text.indexOf('://');
  if (scheme > 0) {
    if (!['ssh', 'https'].includes(text.slice(0, scheme))) return bad(`unparsable remote: ${text}`);
    const rest = text.slice(scheme + 3);
    const slash = rest.indexOf('/');
    if (slash < 0) return bad(`unparsable remote: ${text}`);
    host = rest.slice(0, slash).split('@').pop().split(':')[0];
    path = rest.slice(slash + 1);
  } else {
    const colon = text.indexOf(':');
    if (colon < 0 || text.includes(' ')) return bad(`unparsable remote: ${text}`);
    host = text.slice(0, colon).split('@').pop();
    path = text.slice(colon + 1);
  }
  path = path.replace(/\/$/, '').replace(/\.git$/, '');
  const res = build(host, path, '1');
  return res.ok ? { ok: true, host, project: path } : res;
}

export function parseMrRef(ref, remote) {
  const text = String(ref ?? '').trim();
  if (!text) return bad('missing merge request reference');
  if (text.startsWith('https://')) {
    const rest = text.slice(8);
    const marker = rest.indexOf('/-/merge_requests/');
    const slash = rest.indexOf('/');
    if (marker < 0 || slash < 0 || slash > marker) return bad(`unrecognized merge request reference: ${text}`);
    const iid = rest.slice(marker + 18).split(/[/?#]/)[0];
    return build(rest.slice(0, slash).split(':')[0], rest.slice(slash + 1, marker), iid);
  }
  const short = /^([^!\s]+)!(\S+)$/.exec(text);
  const bang = /^!(\S+)$/.exec(text);
  const bare = /^\d+$/.test(text);
  if (!short && !bang && !bare) return bad(`unrecognized merge request reference: ${text}`);
  if (remote === undefined) return bad('this reference needs --remote <origin url>');
  const r = parseRemote(remote);
  if (!r.ok) return r;
  if (short) return build(r.host, short[1], short[2]);
  return build(r.host, r.project, bang ? bang[1] : text);
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
    d.error('usage: parse-mr-ref.mjs <mr-url | group/project!iid | !iid | iid> [--remote <origin url>]');
    return 2;
  }
  const res = parseMrRef(ref, arg(argv, '--remote'));
  if (res.ok) {
    const { host, project, iid } = res;
    d.log(JSON.stringify({ host, project, iid }));
    return 0;
  }
  d.log(JSON.stringify({ error: res.error }));
  return 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'parse-mr-ref');
