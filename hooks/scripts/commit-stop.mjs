// Stop step (last, run by stop.mjs): when the working tree has uncommitted or untracked changes, ask Claude to run cdk:commit-changes
// (commit and push), then report the result on the next Stop. Never blocks on failure; at most one instruction
// per tree fingerprint and never while a Stop hook is already continuing Claude. Skips changes already present
// at session start (baseline written by session-start.mjs) and merge, rebase, or detached-HEAD states.
import { realpathSync } from 'node:fs';
import { pushed, readState, statePath, treeSnapshot, unsafeState, writeState } from './git-state.mjs';
import { readStdin } from './tools.mjs';

function emit(message, reason) {
  const out = { systemMessage: message };
  if (reason) {
    out.decision = 'block';
    out.reason = reason;
  }
  process.stdout.write(JSON.stringify(out));
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  let cwd;
  try {
    cwd = realpathSync(process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd());
  } catch {
    return;
  }
  // `graphify update .` output never counts as a change to commit.
  const snap = treeSnapshot(cwd, { exclude: ['graphify-out'] });
  if (!snap) return;
  const session = typeof input?.session_id === 'string' ? input.session_id : '';
  const file = statePath('commit', cwd, session);
  const s = readState(file);
  s.instructed = Array.isArray(s.instructed) ? s.instructed : [];

  if (s.pending) {
    const moved = s.pending.head !== snap.head;
    s.pending = null;
    const ok = moved && !snap.dirty && pushed(cwd);
    // Remember the outcome tree so a hook-rewritten file after the commit is not re-instructed.
    if (!ok) s.instructed.push(snap.fp);
    writeState(file, s);
    emit(ok ? '✅ Git changes committed' : '❌ Git changes error');
    return;
  }
  if (!snap.dirty) {
    emit('⏺ No Git changes to commit');
    return;
  }
  if (input?.stop_hook_active === true || s.instructed.includes(snap.fp)) return;
  if (s.baseline && s.baseline === snap.fp) return;
  if (unsafeState(cwd, snap.status)) return;
  s.instructed.push(snap.fp);
  s.pending = { fp: snap.fp, head: snap.head };
  writeState(file, s);
  emit(
    '❗️ Committing Git changes...',
    'The working tree has uncommitted changes. Invoke the `cdk:commit-changes` skill via the Skill tool to commit them, including pushing.'
  );
}

try {
  await main();
} catch {
  // A hook must never fail the turn.
}
