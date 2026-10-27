// Hook script skeleton: reads the event JSON from stdin, runs the steps in order, prints one JSON object.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Steps to run, each { name, cmd, args, timeout in ms }; args is an array, never a shell string.
const STEPS = [];
// true: a failed step blocks the event (exit 2, only where the event allows it); false: it only warns.
const BLOCK_ON_FAILURE = false;

// Parsed stdin object; throws when the text is empty, invalid, or not a JSON object.
export function parseInput(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new TypeError('hook input is not a JSON object');
  return parsed;
}

// Value at a dotted path such as `tool_input.command`; throws naming the path when its type is not `type`.
export function requireField(input, path, type) {
  let value = input;
  for (const key of path.split('.')) value = value !== null && typeof value === 'object' ? value[key] : undefined;
  if (typeof value !== type || (type === 'object' && value === null)) {
    throw new TypeError(`hook input field ${path} must be of type ${type}`);
  }
  return value;
}

// Runs the steps one by one and stops at the first failure, naming it.
export function runSteps(steps, deps = {}) {
  const d = { spawn: spawnSync, ...deps };
  const results = [];
  for (const { name, cmd, args, timeout } of steps) {
    const run = d.spawn(cmd, args, { shell: false, encoding: 'utf8', timeout });
    const ok = run.status === 0 && !run.error;
    const detail = String(run.stderr || run.stdout || run.error?.message || '').slice(0, 300);
    results.push({ name, ok, detail });
    if (!ok) return { ok: false, failed: name, results };
  }
  return { ok: true, failed: null, results };
}

async function readAll(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  return data;
}

// Returns the exit code: 0 allow (one merged JSON line on stdout), 2 block.
export async function main(deps = {}) {
  const d = {
    readStdin: readAll,
    spawn: spawnSync,
    steps: STEPS,
    block: BLOCK_ON_FAILURE,
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    ...deps
  };
  const input = parseInput(await d.readStdin());
  const event = requireField(input, 'hook_event_name', 'string');
  const result = runSteps(d.steps, { spawn: d.spawn });
  if (!result.ok && d.block) {
    d.stderr(`${event}: step ${result.failed} failed: ${result.results.at(-1).detail}\n`);
    return 2;
  }
  const count = result.results.length;
  const message = result.ok
    ? `${event}: ${count} ${count === 1 ? 'step' : 'steps'} ok`
    : `${event}: step ${result.failed} failed`;
  d.stdout(`${JSON.stringify({ systemMessage: message })}\n`);
  return 0;
}

// The one error boundary: an unexpected error prints one stderr line and exits 1 (non-blocking).
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    const [line] = String(error?.message ?? error).split('\n');
    console.error(`hook: ${line.slice(0, 300)}`);
    process.exitCode = 1;
  }
}
