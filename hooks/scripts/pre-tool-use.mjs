// Project PreToolUse hook: block PR/MR creation until changelog and version pass (logic in lib/release-check.mjs).
import { runIfMain } from './lib/hook-io.mjs';
import { runHook } from './lib/release-check.mjs';

// Resolves to the exit code (2 blocks); `deps` are passed to runHook.
export const main = (deps = {}) => runHook(deps);

await runIfMain(import.meta.url, async () => {
  process.exitCode = await main();
});
