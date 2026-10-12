// PostToolUse hook: structural plugin check after Claude edits a plugin file; never runs the LLM-graded eval.
// On any error or warning from `claude plugin validate --strict .`, prints it to stderr and exits 2 so Claude fixes it.
// Hooks cannot run slash commands, so each valid plugin or project component edit prints a reload notice instead.
import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PATHS = ['skills', 'commands', 'agents', 'evals', 'hooks', '.claude-plugin'];
const PLUGIN_RELOAD = ['skills', 'commands', 'agents', 'hooks'];
const PROJECT_DIRS = ['agents', 'hooks', 'rules', 'skills'];
const PROJECT_FILES = ['settings.json', 'CLAUDE.md'];
const MAX = 8000;

const defaults = {
  spawn: spawnSync,
  platform: process.platform,
  env: process.env,
  readStdin: async () => {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data;
  },
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text)
};

// Returns whether the path is a project-scoped Claude Code component under `.claude/`.
export function isProjectScoped(parts) {
  if (parts[0] !== '.claude' || parts.length < 2) return false;
  return parts.length === 2 ? PROJECT_FILES.includes(parts[1]) : PROJECT_DIRS.includes(parts[1]);
}

// Parses the event JSON; invalid or empty input is treated as `{}`.
export function parseEvent(data) {
  try {
    const event = JSON.parse(data) ?? {};
    return typeof event === 'object' && !Array.isArray(event) ? event : {};
  } catch {
    return {};
  }
}

// Plans the hook's work for one edited file: its project-relative path, whether to validate, and the notice to print.
export function plan(file, cwd) {
  if (typeof file !== 'string' || !file) return null;
  const rel = relative(cwd, resolve(cwd, file));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  const parts = rel.split(/[\\/]/);
  const top = parts[0];
  const plugin = PLUGIN_RELOAD.includes(top);
  const project = isProjectScoped(parts);
  const validate = PATHS.includes(top);
  if (!plugin && !project) return { rel, validate, notice: null };
  const commands = new Set();
  if (plugin) commands.add('/reload-plugins');
  if (project) commands.add('/reload-skills');
  const notice = {
    systemMessage: `${rel} changed: run ${[...commands].join(' and ')}${plugin ? ', then /compact to refresh memory' : ''}.`
  };
  if (project) {
    notice.hookSpecificOutput = {
      hookEventName: 'PostToolUse',
      additionalContext: `${rel} was updated; treat its current on-disk content as authoritative and re-read it before relying on it.`
    };
  }
  return { rel, validate, notice };
}

// Runs the strict plugin validation; returns the report to show when it found any error or warning, else null.
export function validate(cwd, deps = defaults) {
  // claude is a .cmd shim on Windows, which needs a shell; args are fixed literals.
  const res = deps.spawn('claude', ['plugin', 'validate', '--strict', '.'], {
    cwd,
    env: { ...deps.env, NO_COLOR: '1' },
    encoding: 'utf8',
    shell: deps.platform === 'win32',
    timeout: 100_000,
    windowsHide: true
  });
  const out = [res.stdout, res.stderr, res.error?.message].filter(Boolean).join('\n').trim();
  if (res.status === 0 && !/warn/i.test(out)) return null;
  return (
    `claude plugin validate --strict . failed (exit ${res.status ?? res.signal}):\n${out.slice(-MAX)}\n` +
    'Fix every error and warning; validation re-runs after the next plugin file edit.'
  );
}

// Returns the exit code: 2 when validation reports a problem, else 0.
export async function main(deps = defaults) {
  const event = parseEvent(await deps.readStdin());
  const cwd = deps.env.CLAUDE_PROJECT_DIR || process.cwd();
  const work = plan(event.tool_input?.file_path, cwd);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
