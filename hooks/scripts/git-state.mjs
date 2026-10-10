// Shared git helpers for the Stop and SessionStart hooks: tree snapshot, unsafe-state check, temp state files.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BIG = 10 << 20;
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

export function git(cwd, args, timeout = 15_000) {
  return spawnSync('git', args, { cwd, maxBuffer: 1 << 28, timeout, windowsHide: true });
}

// Hash of the changed tree (status, tracked diff, untracked contents) with `exclude` paths ignored; null when git fails.
export function treeSnapshot(cwd, { exclude = [], timeout = 15_000 } = {}) {
  const spec = ['--', '.', ...exclude.map((e) => `:(exclude)${e}`)];
  const status = git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all', ...spec], timeout);
  if (status.error || status.status !== 0) return null;
  const head = git(cwd, ['rev-parse', '--verify', '-q', 'HEAD'], timeout);
  const headSha = head.status === 0 ? head.stdout.toString().trim() : '';
  const dirty = status.stdout.length > 0;
  if (!dirty) return { dirty, head: headSha, fp: '', status: '' };
  const hash = createHash('sha256').update(status.stdout);
  const diff = git(cwd, ['diff', 'HEAD', '--binary', ...spec], timeout);
  if (diff.status === 0) hash.update(diff.stdout);
  const untracked = git(cwd, ['ls-files', '-o', '--exclude-standard', '-z', ...spec], timeout);
  for (const f of untracked.stdout.toString().split('\0').filter(Boolean).sort()) {
    hash.update(`\0${f}\0`);
    try {
      const abs = path.join(cwd, f);
      const st = statSync(abs);
      hash.update(st.size > BIG ? `${st.size}:${st.mtimeMs}` : readFileSync(abs));
    } catch {
      // Removed since listing; the name still counts.
    }
  }
  return { dirty, head: headSha, fp: hash.digest('hex'), status: status.stdout.toString() };
}

// True mid-merge, rebase, cherry-pick, revert, bisect, on a detached HEAD, or with unmerged paths: no commit there.
export function unsafeState(cwd, status = '') {
  if (git(cwd, ['symbolic-ref', '-q', 'HEAD']).status !== 0) return true;
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG']) {
    const r = git(cwd, ['rev-parse', '--git-path', name]);
    if (r.status === 0 && existsSync(path.resolve(cwd, r.stdout.toString().trim()))) return true;
  }
  return status.split('\0').some((entry) => /^(U.|.U|AA|DD) /.test(entry));
}

// True when HEAD is on the upstream, or there is no remote to push to; false when a push is still owed.
export function pushed(cwd) {
  const up = git(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (up.status === 0) {
    const r = git(cwd, ['rev-list', '--count', '@{u}..HEAD']);
    return r.status === 0 && (Number.parseInt(r.stdout.toString(), 10) || 0) === 0;
  }
  const remotes = git(cwd, ['remote']);
  return remotes.status === 0 && remotes.stdout.toString().trim() === '';
}

// Temp state file for one hook, per project and (optionally) session.
export const statePath = (name, cwd, session = '') =>
  path.join(tmpdir(), `cdk-${name}-${sha(cwd)}-${sha(session)}.json`);

export function readState(file) {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}

export function writeState(file, state) {
  try {
    writeFileSync(file, JSON.stringify(state));
  } catch {
    // Unwritable temp dir; at worst the next run repeats.
  }
}
