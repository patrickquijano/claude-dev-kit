// Release pipeline state in `.release/state.json`: per-step status, inputs, and outputs, so a stopped run resumes at the first incomplete step.
// CLI: `release-state.mjs <root> show | resume | mark <step> <status> [<outputs-json>] | clear`; the root is an absolute path.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { expected, runIfMain } from '../../../../hooks/scripts/lib/hook-io.mjs';

export const STEP_COUNT = 17;
export const STATUSES = ['pending', 'running', 'done', 'failed'];
export const OUTPUT_KEYS = ['version', 'branch', 'head', 'pr', 'mergedSha', 'tag', 'release', 'checks'];
const VALUE = /^[^\n\r]{0,200}$/;
const STATE_PATH = join('.release', 'state.json');
const LEGACY_PATH = '.release-state.json';

const defaults = {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, text) => writeFileSync(path, text),
  mkdir: (path) => mkdirSync(path, { recursive: true }),
  rm: (path) => rmSync(path, { force: true, recursive: true }),
  stdout: (text) => process.stdout.write(text)
};

// Fresh state with every step pending; `failures` counts handler attempts per failure class.
export function emptyState() {
  const steps = {};
  for (let n = 1; n <= STEP_COUNT; n++) steps[n] = { status: 'pending', inputs: {}, outputs: {} };
  return { schema: 1, steps, failures: {} };
}

// Keeps only whitelisted, single-line string values: never a secret, token, or PR text.
export function cleanValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new TypeError('values must be an object');
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    if (!OUTPUT_KEYS.includes(key)) throw new RangeError(`key not allowed: ${key}`);
    if (typeof value !== 'string' || !VALUE.test(value)) throw new RangeError(`value not allowed for ${key}`);
    out[key] = value;
  }
  return out;
}

// Returns a new state with step `n` set to `status` and its `inputs` or `outputs` merged in.
export function markStep(state, n, status, { inputs = {}, outputs = {} } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > STEP_COUNT) throw new RangeError(`step must be 1-${STEP_COUNT}`);
  if (!STATUSES.includes(status)) throw new RangeError(`status must be one of ${STATUSES.join(', ')}`);
  const step = state.steps[n];
  return {
    ...state,
    steps: {
      ...state.steps,
      [n]: {
        status,
        inputs: { ...step.inputs, ...cleanValues(inputs) },
        outputs: { ...step.outputs, ...cleanValues(outputs) }
      }
    }
  };
}

// The first step that is not done, or null when the release finished.
export function resumePoint(state) {
  for (let n = 1; n <= STEP_COUNT; n++) if (state.steps[n].status !== 'done') return n;
  return null;
}

// Throws unless `value` has the state shape: every step 1-17 with a known status and object inputs and outputs.
export function validateState(value) {
  if (!value || typeof value !== 'object' || value.schema !== 1) throw new TypeError('state schema is not 1');
  for (let n = 1; n <= STEP_COUNT; n++) {
    const step = value.steps?.[n];
    if (!step || !STATUSES.includes(step.status) || typeof step.inputs !== 'object' || typeof step.outputs !== 'object')
      throw new TypeError(`step ${n} is malformed`);
  }
  if (!value.failures || typeof value.failures !== 'object') throw new TypeError('failures is not an object');
  return value;
}

// Converts the legacy `.release-state.json` (`version`, `branch`, `pr`, `mergedSha`, `lastStep`) into the step-keyed shape.
export function migrateLegacy(legacy) {
  const last = legacy?.lastStep;
  if (!Number.isInteger(last) || last < 0 || last > STEP_COUNT)
    throw new TypeError('legacy lastStep is not an integer 0-17');
  const values = Object.fromEntries(
    ['version', 'branch', 'pr', 'mergedSha'].filter((k) => typeof legacy[k] === 'string').map((k) => [k, legacy[k]])
  );
  let state = emptyState();
  for (let n = 1; n <= last; n++) state = markStep(state, n, 'done');
  return markStep(state, Math.max(last, 1), last === 0 ? 'pending' : 'done', { outputs: values });
}

// Absolute path of a file under `root`; throws when `root` is not absolute or the result escapes it.
export function inside(root, file) {
  if (!isAbsolute(root)) throw new TypeError('root must be an absolute path');
  const full = resolve(root, file);
  const rel = relative(root, full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new RangeError('path escapes the root');
  return full;
}

// Reads the state: `{ state, source }` with source `state`, `legacy` (migrated, not yet written), or `none`.
export function loadState(root, deps = defaults) {
  const read = (file) => {
    try {
      return JSON.parse(deps.readFile(inside(root, file)));
    } catch (err) {
      if (!expected(err, 'ENOENT')) throw err;
      return null;
    }
  };
  const current = read(STATE_PATH);
  if (current) return { state: validateState(current), source: 'state' };
  const legacy = read(LEGACY_PATH);
  if (legacy) return { state: migrateLegacy(legacy), source: 'legacy' };
  return { state: null, source: 'none' };
}

// Writes the state under `root` and removes the legacy file once the new one exists.
export function saveState(root, state, deps = defaults) {
  deps.mkdir(inside(root, '.release'));
  deps.writeFile(inside(root, STATE_PATH), `${JSON.stringify(validateState(state), null, 2)}\n`);
  deps.rm(inside(root, LEGACY_PATH));
}

// Runs one CLI command and returns the exit code.
export function run(argv, deps = defaults) {
  const [root, cmd, ...rest] = argv;
  if (!root) return 2;
  const { state, source } = loadState(root, deps);
  if (cmd === 'show') return (deps.stdout(`${JSON.stringify({ source, state })}\n`), 0);
  if (cmd === 'resume') {
    if (!state) return (deps.stdout(`${JSON.stringify({ source, resume: null })}\n`), 1);
    return (deps.stdout(`${JSON.stringify({ source, resume: resumePoint(state) })}\n`), 0);
  }
  if (cmd === 'clear') return (deps.rm(inside(root, '.release')), deps.rm(inside(root, LEGACY_PATH)), 0);
  if (cmd === 'mark') {
    const [step, status, outputs] = rest;
    if (step === undefined || status === undefined) return 2;
    const next = markStep(state ?? emptyState(), Number(step), status, { outputs: outputs ? JSON.parse(outputs) : {} });
    saveState(root, next, deps);
    return 0;
  }
  return 2;
}

await runIfMain(import.meta.url, () => run(process.argv.slice(2)), { label: 'release-state' });
