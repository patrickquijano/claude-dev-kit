// Validates a Conventional Branch name and appends `-2`, `-3`, … until neither a local branch nor an origin branch has it.
// CLI: `--name <type/description> [--no-remote]`, run in the repo root; JSON on stdout, exit 0 = a free name and 1 = invalid or no free name. Reads refs only.
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

const MAX_LENGTH = 72;
export const MAX_SUFFIX = 10;
const NAME = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)\/[a-z0-9-]+$/;

// Null when `name` is `<type>/<short-description>`, lowercase `[a-z0-9-]`, at most 72 chars; else the reason.
export function nameError(name) {
  if (!NAME.test(name) || /--|-$|\/-/.test(name))
    return 'not `<type>/<lowercase-hyphenated-description>` with a known type';
  if (name.length > MAX_LENGTH) return `longer than ${MAX_LENGTH} chars`;
  return null;
}

// The first free name: `name`, then `name-2` … `name-<MAX_SUFFIX + 1>`, truncating the base so base + suffix fits; null when all are taken.
export function freeName(name, taken) {
  if (!taken(name)) return name;
  for (let n = 2; n <= MAX_SUFFIX + 1; n++) {
    const suffix = `-${n}`;
    const candidate = `${name.slice(0, MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken(candidate)) return candidate;
  }
  return null;
}

function arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i < 0 ? undefined : argv[i + 1];
}

// Real side effects; tests pass stubs. A failed `ls-remote` counts as not on the remote.
const realDeps = {
  localExists: (name) =>
    spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`], { timeout: 10000 }).status === 0,
  remoteExists(name) {
    const r = spawnSync('git', ['ls-remote', '--heads', 'origin', `refs/heads/${name}`], {
      encoding: 'utf8',
      timeout: 20000
    });
    return r.status === 0 && r.stdout.trim() !== '';
  },
  log: (text) => console.log(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const name = arg(argv, '--name') ?? '';
  const reason = nameError(name);
  if (reason) {
    d.log(JSON.stringify({ ok: false, code: 'invalid-name', message: `${name}: ${reason}` }));
    return 1;
  }
  const remote = !argv.includes('--no-remote');
  const free = freeName(name, (n) => d.localExists(n) || (remote && d.remoteExists(n)));
  if (!free) {
    d.log(JSON.stringify({ ok: false, code: 'suffix-cap', message: `${MAX_SUFFIX} suffixes of ${name} are taken` }));
    return 1;
  }
  d.log(JSON.stringify({ ok: true, name: free, renamed: free !== name }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'branch-name');
