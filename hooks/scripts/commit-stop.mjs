// Stop step (last, run by stop.mjs): when the working tree has uncommitted or untracked changes, ask Claude to run cdk:commit-changes
// (commit and push), then report the result on the next Stop. Never blocks on failure; at most one instruction
// per tree fingerprint and never while a Stop hook is already continuing Claude. Skips while the ship-release marker exists,
// for changes already present at session start (baseline written by session-start.mjs), and in merge, rebase, or detached-HEAD states.
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, pushed, readState, statePath, treeSnapshot, unsafeState, writeState } from './git-state.mjs';
import { readStdin } from './tools.mjs';

// Side effects as a swappable bundle so tests never touch git, the fs, or the temp dir.
export const realDeps = {
  git,
  pushed,
  readState,
  statePath,
  treeSnapshot,
  unsafeState,
  writeState,
  existsSync,
  realpathSync,
  env: process.env,
  cwd: () => process.cwd()
};

export function message(text, reason) {
  const out = { systemMessage: text };
  if (reason) {
    out.decision = 'block';
    out.reason = reason;
  }
  return out;
}

// Returns the hook's JSON output, or null for no output.
export function commitStop(input, deps = realDeps) {
  let cwd;
  try {
    cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input?.cwd || deps.cwd());
  } catch {
    return null;
  }
  // `graphify update .` output never counts as a change to commit.
  const snap = deps.treeSnapshot(cwd, { exclude: ['graphify-out'] });
  if (!snap) return null;
  // /cdk:ship-release owns its commits while its marker exists.
  const hold = deps.git(cwd, ['rev-parse', '--git-path', 'cdk-ship-release']);
  if (hold.status === 0 && deps.existsSync(path.resolve(cwd, hold.stdout.toString().trim()))) {
    return message('⏸ ship-release pending: not committing');
  }
  const session = typeof input?.session_id === 'string' ? input.session_id : '';
  const file = deps.statePath('commit', cwd, session);
  const s = deps.readState(file);
  s.instructed = Array.isArray(s.instructed) ? s.instructed : [];

  if (s.pending) {
    const moved = s.pending.head !== snap.head;
    s.pending = null;
    const ok = moved && !snap.dirty && deps.pushed(cwd);
    // Remember the outcome tree so a hook-rewritten file after the commit is not re-instructed.
    if (!ok) s.instructed.push(snap.fp);
    deps.writeState(file, s);
    return message(ok ? '✅ Git changes committed' : '❌ Git changes error');
  }
  if (!snap.dirty) return message('⏺ No Git changes to commit');
  if (input?.stop_hook_active === true || s.instructed.includes(snap.fp)) return null;
  if (s.baseline && s.baseline === snap.fp) return null;
  if (deps.unsafeState(cwd, snap.status)) return null;
  s.instructed.push(snap.fp);
  s.pending = { fp: snap.fp, head: snap.head };
  deps.writeState(file, s);
  return message(
    '❗️ Committing Git changes...',
    'The working tree has uncommitted changes. Invoke the `cdk:commit-changes` skill via the Skill tool to commit them, including pushing.'
  );
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const out = commitStop(input);
  if (out) process.stdout.write(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
}
