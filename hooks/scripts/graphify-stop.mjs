// Stop hook: keep the Graphify knowledge graph current. Never blocks on failure; blocks only to ask Claude
// to initialize a missing graph, once per session and never again after a failed init. Updates run only when the
// tree changed since the last run. State lives in os.tmpdir(): per session (init) and per project (last run, failed init).
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readState, statePath, treeSnapshot, writeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist, runGraphify } from './graphify.mjs';
import { readStdin } from './tools.mjs';

const UPDATE_TIMEOUT = 240_000;

// Side effects as a swappable bundle so tests never touch git, graphify, the fs, or the temp dir.
export const realDeps = {
  graphifyConfigured,
  graphifyFilesExist,
  readState,
  realpathSync,
  runGraphify,
  statePath,
  treeSnapshot,
  writeState,
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
export function graphifyStop(input, deps = realDeps) {
  let cwd;
  try {
    cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input?.cwd || deps.cwd());
  } catch {
    return null;
  }
  if (!deps.graphifyConfigured(cwd)) return null;
  const sessionFile = deps.statePath('graphify', cwd, typeof input?.session_id === 'string' ? input.session_id : '');
  const projectFile = deps.statePath('graphify', cwd);
  const s = deps.readState(sessionFile);
  const p = deps.readState(projectFile);
  const present = deps.graphifyFilesExist(cwd);

  if (s.init === 'pending') {
    s.init = present ? 'done' : 'failed';
    if (present) delete p.initFailed;
    else p.initFailed = true;
    deps.writeState(sessionFile, s);
    deps.writeState(projectFile, p);
    return message(present ? '✅ Graphify knowledge initialized' : '❌ Graphify knowledge initialize error');
  }
  if (present) {
    // A rerun in the same turn (after a Stop hook continued Claude) adds nothing.
    if (input?.stop_hook_active === true) return null;
    // Outside git there is no fingerprint, so update every turn.
    const snap = deps.treeSnapshot(cwd, { exclude: ['graphify-out'] });
    const key = snap ? `${snap.head}:${snap.fp}` : null;
    if (key !== null && p.lastKey === key) return null;
    const r = deps.runGraphify(['update', '.'], cwd, UPDATE_TIMEOUT);
    const ok = !r.error && r.status === 0;
    // Failure is remembered too: no retry on the same tree.
    p.lastKey = key;
    delete p.initFailed;
    deps.writeState(projectFile, p);
    return message(
      ok
        ? '❗️ Updating Graphify knowledge... | ✅ Graphify knowledge updated'
        : '❗️ Updating Graphify knowledge... | ❌ Graphify knowledge update error'
    );
  }
  // Graph missing: ask once per session; after a failure or success never ask again.
  if (s.init || p.initFailed || input?.stop_hook_active === true) return null;
  s.init = 'pending';
  deps.writeState(sessionFile, s);
  return message(
    '❗️ Initializing Graphify knowledge...',
    'Graphify is set up but its knowledge graph is missing. Invoke the `graphify` skill with the argument `.` via the Skill tool to build it.'
  );
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const out = graphifyStop(input);
  if (out) process.stdout.write(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
}
