// Read-only GitLab GET for merge-gitlab-merge-request: checks the host and endpoint against fixed shapes, then runs `glab api --hostname <host> <endpoint>`.
// CLI: `glab-get.mjs <host> <endpoint>` prints the response body; exit 0 = ok, 1 = glab failed, 2 = bad arguments.
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

const HOST = /^[A-Za-z0-9.:-]+$/;
const ENDPOINTS = [
  /^projects\/[\w.~%-]+$/,
  /^projects\/[\w.~%-]+\/merge_requests\/\d+\/approvals$/,
  /^projects\/[\w.~%-]+\/repository\/commits\/[0-9a-f]{7,64}$/,
  /^projects\/[\w.~%-]+\/repository\/branches\/[\w.~%-]+$/
];

// True when `host` is a plain hostname and `endpoint` matches one of the read-only shapes.
export function isAllowed(host, endpoint) {
  return (
    HOST.test(host) && !host.startsWith('-') && !endpoint.includes('..') && ENDPOINTS.some((re) => re.test(endpoint))
  );
}

const realDeps = {
  run: (args) => {
    const res = spawnSync('glab', args, { encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    if (res.error) throw res.error;
    return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  },
  write: (text) => process.stdout.write(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 2 || !isAllowed(argv[0], argv[1])) {
    d.error('usage: glab-get.mjs <host> <endpoint> (a read-only endpoint this skill uses)');
    return 2;
  }
  const res = d.run(['api', '--hostname', argv[0], argv[1]]);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `glab exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'glab-get');
