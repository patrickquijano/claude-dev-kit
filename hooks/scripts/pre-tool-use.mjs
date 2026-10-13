// Plugin PreToolUse dispatcher: the git safety guard first, then the release gate (logic in lib/git-guard.mjs and
// lib/release-check.mjs). Exit 2 blocks; a guard "ask" prints the permission JSON once the release gate passes.
import { decide } from './lib/git-guard.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';
import { runHook } from './lib/release-check.mjs';

// Resolves to the exit code (2 blocks); `deps` are passed to the guard and to runHook.
export async function main(deps = {}) {
  const event = await (deps.readJsonStdin ?? readJsonStdin)();
  const write = deps.stderr ?? ((text) => process.stderr.write(text));
  const guard = decide(event, deps);
  if (guard.decision === 'block') {
    write(`${guard.reason}\n`);
    return 2;
  }
  const code = await runHook(deps, event);
  if (code === 0 && guard.decision === 'ask') {
    const print = deps.stdout ?? ((text) => process.stdout.write(text));
    print(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: guard.reason
        }
      })
    );
  }
  return code;
}

// A gate fails closed: an unexpected error blocks (exit 2).
await runIfMain(import.meta.url, main, { label: 'pre-tool-use', failCode: 2 });
