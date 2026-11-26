// Read-only host GET for delete-branches: checks the host kind and endpoint against fixed shapes, then runs `gh api <endpoint>` or `glab api <endpoint>` with no method or field flag.
// CLI: `host-get.mjs <github|gitlab> <endpoint>` prints the response body; exit 0 = ok, 1 = CLI failed, 2 = bad arguments.
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

const ENDPOINTS = {
  github: [
    /^repos\/[\w.-]+\/[\w.-]+\/branches\?protected=true$/,
    /^repos\/[\w.-]+\/[\w.-]+\/rules\/branches\/[\w.~%-]+$/
  ],
  gitlab: [/^projects\/[\w.~%-]+\/protected_branches$/]
};

// True when `kind` is a known host and `endpoint` matches one of its read-only shapes.
export function isAllowed(kind, endpoint) {
  return Object.hasOwn(ENDPOINTS, kind) && !endpoint.includes('..') && ENDPOINTS[kind].some((re) => re.test(endpoint));
}

const realDeps = {
  run: (cli, args) => {
    const res = spawnSync(cli, args, { encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    if (res.error) throw res.error;
    return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  },
  write: (text) => process.stdout.write(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code. The branches listing adds `--paginate`.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 2 || !isAllowed(argv[0], argv[1])) {
    d.error('usage: host-get.mjs <github|gitlab> <endpoint> (a read-only endpoint this skill uses)');
    return 2;
  }
  const [kind, endpoint] = argv;
  const args = ['api', endpoint];
  if (kind === 'github' && endpoint.endsWith('/branches?protected=true')) args.push('--paginate');
  const res = d.run(kind === 'github' ? 'gh' : 'glab', args);
  if (res.status !== 0) {
    d.error((res.stderr.split('\n').find((l) => l.trim()) ?? `${kind} CLI exited ${res.status}`).trim().slice(0, 300));
    return 1;
  }
  d.write(res.stdout);
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'host-get');
