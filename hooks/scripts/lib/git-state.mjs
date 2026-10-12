// Shared git helpers for hooks: unsafe-state check and temp state files.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Side effects as a swappable bundle so tests never touch git, the fs, or the temp dir.
export const realDeps = { proc: spawnSync, existsSync, readFileSync, statSync, writeFileSync, tmpdir };
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

export function git(cwd, args, timeout = 15_000, deps = realDeps, maxBuffer = 1 << 28) {
  return deps.proc('git', args, { cwd, maxBuffer, timeout, windowsHide: true });
}

// True mid-merge, rebase, cherry-pick, revert, bisect, on a detached HEAD, or with unmerged paths: no commit there.
export function unsafeState(cwd, status = '', deps = realDeps) {
  if (git(cwd, ['symbolic-ref', '-q', 'HEAD'], undefined, deps).status !== 0) return true;
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG']) {
    const r = git(cwd, ['rev-parse', '--git-path', name], undefined, deps);
    if (r.status === 0 && deps.existsSync(path.resolve(cwd, r.stdout.toString().trim()))) return true;
  }
  return status.split('\0').some((entry) => /^(U.|.U|AA|DD) /.test(entry));
}

// Temp state file for one hook, per project and (optionally) session.
export const statePath = (name, cwd, session = '', deps = realDeps) =>
  path.join(deps.tmpdir(), `cdk-${name}-${sha(cwd)}-${sha(session)}.json`);

export function readState(file, deps = realDeps) {
  try {
    const s = JSON.parse(deps.readFileSync(file, 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}

export function writeState(file, state, deps = realDeps) {
  try {
    deps.writeFileSync(file, JSON.stringify(state));
  } catch {
    // Unwritable temp dir; at worst the next run repeats.
  }
}
