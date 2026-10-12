// Project PreToolUse hook: block PR/MR creation until changelog and version pass (logic in lib/release-check.mjs).
import { runIfMain } from './lib/hook-io.mjs';
import { runHook } from './lib/release-check.mjs';

// Resolves to the exit code (2 blocks); `deps` are passed to runHook.
export const main = (deps = {}) => runHook(deps);

// A gate fails closed: an unexpected error blocks (exit 2).
await runIfMain(import.meta.url, main, { label: 'pre-tool-use', failCode: 2 });
