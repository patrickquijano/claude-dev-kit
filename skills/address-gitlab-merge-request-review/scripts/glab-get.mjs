// Read-only GitLab GET for address-gitlab-merge-request-review: checks the host and endpoint against fixed shapes, then runs `glab api --hostname <host> <endpoint>`.
// CLI: `glab-get.mjs <host> <endpoint>` prints the response body (for /diffs only a JSON array of `new_path`); exit 0 = ok, 1 = glab failed or a bad /diffs body, 2 = bad arguments.
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
const DIFFS = /^projects\/[\w.~%-]+\/merge_requests\/\d+\/diffs\?per_page=\d+&page=\d+$/;
const ENDPOINTS = [
  /^projects\/[\w.~%-]+\/merge_requests\/\d+\/discussions\?per_page=\d+$/,
  /^projects\/[\w.~%-]+\/merge_requests\/\d+\/discussions\?per_page=\d+&page=\d+$/,
  DIFFS,
  /^projects\/[\w.~%-]+\/merge_requests\/\d+\/(?:reviewers|closes_issues)$/,
  /^projects\/[\w.~%-]+\/merge_requests\/\d+\/pipelines\?per_page=\d+$/,
  /^projects\/[\w.~%-]+\/pipelines\/\d+\/jobs\?scope=failed&per_page=\d+$/,
  /^projects\/[\w.~%-]+\/jobs\/\d+\/trace$/,
  /^projects\/[\w.~%-]+\/members\/all\/\d+$/,
  /^user$/
];

// True when `host` is a plain hostname and `endpoint` matches one of the read-only shapes.
export function isAllowed(host, endpoint) {
  return (
    HOST.test(host) &&
    !host.startsWith('-') &&
    !endpoint.includes('..') &&
    !/%2e/i.test(endpoint) &&
    ENDPOINTS.some((re) => re.test(endpoint))
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

// The `new_path` of each /diffs entry, or null when the body is not a complete JSON array of such entries.
function newPaths(body) {
  let entries;
  try {
    entries = JSON.parse(body);
  } catch (err) {
    if (err instanceof SyntaxError) return null;
    throw err;
  }
  if (!Array.isArray(entries) || entries.some((e) => typeof e?.new_path !== 'string')) return null;
  return entries.map((e) => e.new_path);
}

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
  if (DIFFS.test(argv[1])) {
    const paths = newPaths(res.stdout);
    if (!paths) {
      d.error('/diffs response is not a JSON array of entries with new_path');
      return 1;
    }
    d.write(JSON.stringify(paths));
    return 0;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'glab-get');
