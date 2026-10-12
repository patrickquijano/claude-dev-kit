// Stop hook dispatcher: Claude Code runs hooks of one event in parallel, so this single hook runs the Stop steps in
// order (format-lint, Graphify, commit) and stops at the first block. The commit step therefore always runs last,
// once nothing else has feedback. Never fails the turn; a step that errors or prints non-JSON is skipped.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readState, statePath, writeState } from './git-state.mjs';
import { readStdin } from './tools.mjs';

export const STEPS = [
  { name: 'format-lint', script: 'format-lint-repo.mjs', timeout: 600_000 },
  { name: 'graphify', script: 'graphify-stop.mjs', timeout: 300_000 },
  { name: 'commit', script: 'commit-stop.mjs', timeout: 60_000 }
];

// Side effects as a swappable bundle so tests never spawn a process or touch the fs.
export const realDeps = {
  proc: spawnSync,
  readState,
  realpathSync,
  statePath,
  writeState,
  scriptPath: (script) => fileURLToPath(new URL(script, import.meta.url)),
  execPath: process.execPath,
  env: process.env,
  cwd: () => process.cwd()
};

// JSON object a step printed, or null when it failed or printed anything else.
export function runStep(step, input, deps = realDeps) {
  const r = deps.proc(deps.execPath, [deps.scriptPath(step.script)], {
    input: JSON.stringify(input),
    env: deps.env,
    timeout: step.timeout,
    maxBuffer: 1 << 26,
    windowsHide: true
  });
  if (r.error || r.status !== 0) return null;
  try {
    const out = JSON.parse(r.stdout.toString());
    return out && typeof out === 'object' ? out : null;
  } catch {
    return null;
  }
}

// Returns the combined hook output, or null for no output.
export function stop(input, deps = realDeps) {
  let cwd = '';
  try {
    cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input?.cwd || deps.cwd());
  } catch {
    // Steps resolve the directory themselves and skip when it is unusable.
  }
  const file = deps.statePath('stop', cwd, typeof input?.session_id === 'string' ? input.session_id : '');
  const state = deps.readState(file);
  // `stop_hook_active` means a Stop hook already continued Claude; a step sees it only when it caused that block.
  const continued = input?.stop_hook_active === true;

  const messages = [];
  let block = null;
  let blocker = '';
  for (const step of STEPS) {
    const out = runStep(step, { ...input, stop_hook_active: continued && state.blocker === step.name }, deps);
    if (!out) continue;
    if (typeof out.systemMessage === 'string' && out.systemMessage) messages.push(out.systemMessage);
    if (out.decision === 'block') {
      block = out;
      blocker = step.name;
      break;
    }
  }
  if (state.blocker !== blocker) deps.writeState(file, { ...state, blocker });
  if (!messages.length && !block) return null;
  const result = { systemMessage: messages.join(' | ') };
  if (block) {
    result.decision = 'block';
    result.reason = block.reason;
  }
  return result;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const out = stop(input);
  if (out) process.stdout.write(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
}
