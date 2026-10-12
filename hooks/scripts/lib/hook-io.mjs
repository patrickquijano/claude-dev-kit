// I/O helpers shared by every hook entry script: run-as-script guard, stdin, project dir, and output objects.
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Cap for text a hook sends back to Claude.
export const MAX = 8000;

// Runs `fn` only when the module is the process entry script (not when imported by tests).
export async function runIfMain(metaUrl, fn, argv = process.argv) {
  if (argv[1] && metaUrl === pathToFileURL(argv[1]).href) await fn();
}

// Reads stdin asynchronously; sync reads of a piped fd 0 can throw EAGAIN on Windows.
export async function readStdin(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  return data;
}

// Parsed stdin object, or null when it is empty, invalid, or not an object.
export async function readJsonStdin(stream = process.stdin) {
  try {
    const parsed = JSON.parse(await readStdin(stream));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Real project directory. Default order: CLAUDE_PROJECT_DIR, event cwd, process cwd; `prefer: 'cwd'` puts the event cwd first.
// Throws when the directory does not exist.
export function projectDir(input, deps = {}, { prefer } = {}) {
  const d = { env: process.env, cwd: () => process.cwd(), realpath: realpathSync, ...deps };
  const fromInput = typeof input?.cwd === 'string' && input.cwd ? input.cwd : '';
  const first = prefer === 'cwd' ? [fromInput, d.env.CLAUDE_PROJECT_DIR] : [d.env.CLAUDE_PROJECT_DIR, fromInput];
  return d.realpath(first.find(Boolean) || d.cwd());
}

// Hook output that adds context for Claude; extra top-level fields (systemMessage) go in `extra`.
export const contextOutput = (event, text, extra = {}) => ({
  ...extra,
  hookSpecificOutput: { hookEventName: event, additionalContext: text }
});

// Hook output that blocks with a reason capped at MAX.
export const blockOutput = (systemMessage, reason) => ({
  systemMessage,
  decision: 'block',
  reason: reason.slice(0, MAX)
});
