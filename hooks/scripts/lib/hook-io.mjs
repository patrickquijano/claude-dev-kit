// I/O helpers shared by every hook entry script: run-as-script guard, stdin, project dir, and output objects.
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Cap for text a hook sends back to Claude.
export const MAX = 8000;

// True when `err.code` is one of `codes`: the guard for a catch that skips an expected condition (rethrow the rest).
export const expected = (err, ...codes) => codes.includes(err?.code);

const oneLine = (err) =>
  String(err?.message ?? err)
    .split('\n')[0]
    .slice(0, 300);

// Entry-script error boundary: runs `fn` only when the module is the process entry, and a number it returns becomes the exit code.
// On a throw it prints `cdk <label>: <message>` to stderr and exits `failCode` (default 1); `failCode: 0` is not a silent exit: it prints a stdout `systemMessage` JSON and sets no exit code (Stop hooks).
export async function runIfMain(metaUrl, fn, { label = 'hook', failCode = 1 } = {}, argv = process.argv, io = {}) {
  if (!argv[1] || metaUrl !== pathToFileURL(argv[1]).href) return;
  const {
    stderr = (text) => process.stderr.write(text),
    stdout = (text) => process.stdout.write(text),
    setExit = (code) => (process.exitCode = code)
  } = io;
  try {
    const code = await fn();
    if (typeof code === 'number') setExit(code);
  } catch (err) {
    const message = `cdk ${label}: ${oneLine(err)}`;
    if (failCode === 0) {
      stdout(`${JSON.stringify({ systemMessage: message })}\n`);
      return;
    }
    stderr(`${message}\n`);
    setExit(failCode);
  }
}

// Reads stdin asynchronously; sync reads of a piped fd 0 can throw EAGAIN on Windows.
export async function readStdin(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  return data;
}

// Parsed stdin object; throws when it is empty, invalid, or not an object (the harness always sends an object).
export async function readJsonStdin(stream = process.stdin) {
  const parsed = JSON.parse(await readStdin(stream));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new TypeError('hook input is not a JSON object');
  return parsed;
}

// Real project directory. Default order: CLAUDE_PROJECT_DIR, event cwd, process cwd; `prefer: 'cwd'` puts the event cwd first.
// Throws when the directory does not exist.
export function projectDir(input, deps = {}, { prefer } = {}) {
  const d = { env: process.env, cwd: () => process.cwd(), realpath: realpathSync, ...deps };
  const fromInput = typeof input?.cwd === 'string' && input.cwd ? input.cwd : '';
  const first = prefer === 'cwd' ? [fromInput, d.env.CLAUDE_PROJECT_DIR] : [d.env.CLAUDE_PROJECT_DIR, fromInput];
  return d.realpath(first.find(Boolean) || d.cwd());
}

// Hook output that adds context for Claude, capped at MAX characters; extra top-level fields (systemMessage) go in `extra`.
export const contextOutput = (event, text, extra = {}) => ({
  ...extra,
  hookSpecificOutput: { hookEventName: event, additionalContext: text.slice(0, MAX) }
});

// Stop hook output that continues Claude with `reason` as additional context; the transcript shows no hook error.
export const stopOutput = (systemMessage, reason) => contextOutput('Stop', reason, { systemMessage });
