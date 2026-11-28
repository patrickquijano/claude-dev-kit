// PostToolUse hook: structural plugin check after Claude edits a plugin file (never the LLM-graded eval), plus advice listing tests that may pin an edited skill or agent; a nonzero exit (`--strict` turns warnings into errors) goes to stderr with exit 2 so Claude fixes it.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  MAX,
  contextOutput,
  expected,
  projectDir,
  readJsonStdin,
  runIfMain
} from '../../hooks/scripts/lib/hook-io.mjs';

const PATHS = ['skills', 'commands', 'agents', 'evals', 'hooks', '.claude-plugin'];
const TIMEOUT_MS = 100_000;
const MAX_PIN_TESTS = 8;

const defaults = {
  spawn: spawnSync,
  platform: process.platform,
  env: process.env,
  realpath: realpathSync,
  readdir: (dir) => readdirSync(dir, { withFileTypes: true }),
  readFile: (path) => readFileSync(path, 'utf8'),
  readJsonStdin,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
};

// Resolves symlinks so a link cannot point outside the project; a missing file keeps its resolved path.
function realTarget(path, realpath) {
  try {
    return realpath(path);
  } catch (err) {
    if (!expected(err, 'ENOENT')) throw err;
    return path;
  }
}

// Returns the skill or agent name an edited path belongs to (`skills/<name>/…`, `agents/<name>.md`), else null.
function pinName(parts) {
  if (parts[0] === 'skills' && parts.length > 2) return parts[1];
  if (parts[0] === 'agents' && parts.length === 2 && parts[1].endsWith('.md')) return parts[1].slice(0, -3);
  return null;
}

// Plans the hook's work for one edited file: its project-relative path, whether to validate and the pin hint.
// `cwd` must already be a real path (`projectDir`).
export function plan(file, cwd, realpath = realpathSync) {
  if (typeof file !== 'string' || !file) return null;
  const rel = relative(cwd, realTarget(resolve(cwd, file), realpath));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  const parts = rel.split(/[\\/]/);
  const top = parts[0];
  const validate = PATHS.includes(top);
  const pin = pinName(parts);
  return { rel, validate, ...(pin && { pin }) };
}

// Lists up to MAX_PIN_TESTS test files under `tests/` that mention `skills/<name>` or `agents/<name>`; a grep finds candidates, not changed wording.
export function findPinTests(cwd, name, deps = defaults) {
  const needles = [`skills/${name}`, `agents/${name}`];
  const mentions = (text) =>
    needles.some((needle) => {
      for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
        if (!/[\w-]/.test(text[i + needle.length] ?? '')) return true;
      }
      return false;
    });
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = deps.readdir(dir);
    } catch (err) {
      if (!expected(err, 'ENOENT')) throw err;
      return;
    }
    for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
      if (found.length >= MAX_PIN_TESTS) return;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.test.mjs') && mentions(deps.readFile(path))) found.push(relative(cwd, path));
    }
  };
  walk(join(cwd, 'tests'));
  return found;
}

// Runs the strict plugin validation; returns the report when it exits nonzero, else null.
export function validate(cwd, deps = defaults) {
  // claude is a .cmd shim on Windows, which needs a shell; args are fixed literals.
  const res = deps.spawn('claude', ['plugin', 'validate', '--strict', '.'], {
    cwd,
    env: { ...deps.env, NO_COLOR: '1' },
    encoding: 'utf8',
    shell: deps.platform === 'win32',
    timeout: TIMEOUT_MS,
    windowsHide: true
  });
  if (res.status === 0) return null;
  if (res.error?.code === 'ETIMEDOUT') {
    return `claude plugin validate --strict . timed out after ${TIMEOUT_MS / 1000} s`;
  }
  if (res.error) return `claude CLI could not run: ${res.error.message}`;
  const out = [res.stdout, res.stderr].filter(Boolean).join('\n').trim();
  return (
    `claude plugin validate --strict . failed (exit ${res.status ?? res.signal}):\n${out.slice(-MAX)}\n` +
    'Fix every error and warning; validation re-runs after the next plugin file edit.'
  );
}

// Returns the exit code: 2 when validation reports a problem, else 0.
export async function main(deps = defaults) {
  const event = await deps.readJsonStdin();
  const cwd = projectDir(event, { env: deps.env, realpath: deps.realpath });
  const work = plan(event.tool_input?.file_path, cwd, deps.realpath);
  if (!work) return 0;
  if (work.validate) {
    const report = validate(cwd, deps);
    if (report) {
      deps.stderr(report);
      return 2;
    }
  }
  const pinned = work.pin ? findPinTests(cwd, work.pin, deps) : [];
  if (pinned.length > 0) {
    const advice = `${work.rel} changed; these tests mention it and may pin its old wording: ${pinned.join(', ')}. Update pinned assertions in the same change.`;
    deps.stdout(JSON.stringify(contextOutput('PostToolUse', advice)));
  }
  return 0;
}

// A gate fails closed: an unexpected error exits 2 so Claude sees it.
await runIfMain(import.meta.url, main, { label: 'post-tool-use (validate)', failCode: 2 });
