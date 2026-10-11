// Stop hook: keep the Graphify knowledge graph current. Never blocks on failure; blocks only to ask Claude
// to initialize a missing graph, once per session and never again after a failed init. Updates run only when the
// tree changed since the last run. State lives in os.tmpdir(): per session (init) and per project (last run, failed init).
import { realpathSync } from 'node:fs';
import { readState, statePath, treeSnapshot, writeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist, runGraphify } from './graphify.mjs';
import { readStdin } from './tools.mjs';

const UPDATE_TIMEOUT = 240_000;

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
  if (!graphifyConfigured(cwd)) return;
  const sessionFile = statePath('graphify', cwd, typeof input?.session_id === 'string' ? input.session_id : '');
  const projectFile = statePath('graphify', cwd);
  const s = readState(sessionFile);
  const p = readState(projectFile);
  const present = graphifyFilesExist(cwd);

  if (s.init === 'pending') {
    s.init = present ? 'done' : 'failed';
    if (present) delete p.initFailed;
    else p.initFailed = true;
    writeState(sessionFile, s);
    writeState(projectFile, p);
    emit(present ? '✅ Graphify knowledge initialized' : '❌ Graphify knowledge initialize error');
    return;
  }
  if (present) {
    // A rerun in the same turn (after a Stop hook continued Claude) adds nothing.
    if (input?.stop_hook_active === true) return;
    // Outside git there is no fingerprint, so update every turn.
    const snap = treeSnapshot(cwd, { exclude: ['graphify-out'] });
    const key = snap ? `${snap.head}:${snap.fp}` : null;
    if (key !== null && p.lastKey === key) return;
    const r = runGraphify(['update', '.'], cwd, UPDATE_TIMEOUT);
    const ok = !r.error && r.status === 0;
    // Failure is remembered too: no retry on the same tree.
    p.lastKey = key;
    delete p.initFailed;
    writeState(projectFile, p);
    emit(
      ok
        ? '❗️ Updating Graphify knowledge... | ✅ Graphify knowledge updated'
        : '❗️ Updating Graphify knowledge... | ❌ Graphify knowledge update error'
    );
    return;
  }
  // Graph missing: ask once per session; after a failure or success never ask again.
  if (s.init || p.initFailed || input?.stop_hook_active === true) return;
  s.init = 'pending';
  writeState(sessionFile, s);
  emit(
    '❗️ Initializing Graphify knowledge...',
    'Graphify is set up but its knowledge graph is missing. Invoke the `graphify` skill with the argument `.` via the Skill tool to build it.'
  );
}

try {
  await main();
} catch {
  // A hook must never fail the turn.
}
