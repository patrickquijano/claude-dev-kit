// Shared git helpers for hooks: temp state file paths.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Side effects as a swappable bundle so tests never touch git, the fs, or the temp dir.
export const realDeps = { proc: spawnSync, tmpdir };
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

export function git(cwd, args, timeout = 15_000, deps = realDeps, maxBuffer = 1 << 28) {
  return deps.proc('git', args, { cwd, maxBuffer, timeout, windowsHide: true });
}

// Temp state file for one hook, per project and (optionally) session.
export const statePath = (name, cwd, session = '', deps = realDeps) =>
  path.join(deps.tmpdir(), `cdk-${name}-${sha(cwd)}-${sha(session)}.json`);
