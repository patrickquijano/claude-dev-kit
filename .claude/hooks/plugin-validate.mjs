// PostToolUse hook: structural plugin check after Claude edits a plugin file; never runs the LLM-graded eval.
// On any error or warning from `claude plugin validate --strict .`, prints it to stderr and exits 2 so Claude fixes it.
import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';

const PATHS = ['skills', 'agents', 'evals', 'hooks', '.claude-plugin'];
const MAX = 8000;

// Reads the event JSON; invalid or empty input is treated as `{}`.
async function readEvent() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  try {
    return JSON.parse(data) ?? {};
  } catch {
    return {};
  }
}

async function main() {
  const event = await readEvent();
  const file = event.tool_input?.file_path;
  if (typeof file !== 'string' || !file) return;
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const rel = relative(cwd, resolve(cwd, file));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return;
  const top = rel.split(/[\\/]/)[0];
  if (!PATHS.includes(top)) return;
  // claude is a .cmd shim on Windows, which needs a shell; args are fixed literals.
  const res = spawnSync('claude', ['plugin', 'validate', '--strict', '.'], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 100_000,
    windowsHide: true
  });
  const out = [res.stdout, res.stderr, res.error?.message].filter(Boolean).join('\n').trim();
  if (res.status === 0 && !/warn/i.test(out)) return;
  process.stderr.write(
    `claude plugin validate --strict . failed (exit ${res.status ?? res.signal}):\n${out.slice(-MAX)}\n` +
      'Fix every error and warning; validation re-runs after the next plugin file edit.'
  );
  process.exit(2);
}

await main();
