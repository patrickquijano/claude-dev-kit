// PostToolUse hook: structural plugin check after Claude edits a plugin file (never the LLM-graded eval); a nonzero exit (`--strict` turns warnings into errors) goes to stderr with exit 2 so Claude fixes it.
// Hooks cannot run slash commands, so each valid project component edit prints a `/reload-skills` notice instead.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  MAX,
  contextOutput,
  expected,
  projectDir,
  readJsonStdin,
  runIfMain
} from '../../hooks/scripts/lib/hook-io.mjs';

const PATHS = ['skills', 'commands', 'agents', 'evals', 'hooks', '.claude-plugin'];
const PROJECT_DIRS = ['agents', 'hooks', 'rules', 'skills'];
const PROJECT_FILES = ['settings.json', 'CLAUDE.md'];
const TIMEOUT_MS = 100_000;

const defaults = {
  spawn: spawnSync,
  platform: process.platform,
  env: process.env,
  realpath: realpathSync,
  readJsonStdin,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
};

// Returns whether the path is a project-scoped Claude Code component under `.claude/`.
export function isProjectScoped(parts) {
  if (parts[0] !== '.claude' || parts.length < 2) return false;
  return parts.length === 2 ? PROJECT_FILES.includes(parts[1]) : PROJECT_DIRS.includes(parts[1]);
}

// Resolves symlinks so a link cannot point outside the project; a missing file keeps its resolved path.
function realTarget(path, realpath) {
  try {
    return realpath(path);
  } catch (err) {
    if (!expected(err, 'ENOENT')) throw err;
    return path;
  }
}

// Plans the hook's work for one edited file: its project-relative path, whether to validate, and the notice to print.
// `cwd` must already be a real path (`projectDir`).
export function plan(file, cwd, realpath = realpathSync) {
  if (typeof file !== 'string' || !file) return null;
  const rel = relative(cwd, realTarget(resolve(cwd, file), realpath));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  const parts = rel.split(/[\\/]/);
  const top = parts[0];
  const project = isProjectScoped(parts);
  const validate = PATHS.includes(top);
  if (!project) return { rel, validate, notice: null };
  const notice = {
    systemMessage: `${rel} changed: run /reload-skills.`,
    ...contextOutput(
      'PostToolUse',
      `${rel} was updated; treat its current on-disk content as authoritative and re-read it before relying on it.`
    )
  };
  return { rel, validate, notice };
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
  if (work.notice) deps.stdout(JSON.stringify(work.notice));
  return 0;
}

// A gate fails closed: an unexpected error exits 2 so Claude sees it.
await runIfMain(import.meta.url, main, { label: 'post-tool-use (validate)', failCode: 2 });
