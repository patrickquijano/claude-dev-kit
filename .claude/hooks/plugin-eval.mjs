// Stop hook: validate the plugin and run its full eval suite when plugin files changed since the last run.
// On any error, warning, or failing case, prints a summary to stderr and exits 2 so Claude fixes it.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PATHS = ['skills', 'agents', 'evals', 'hooks', '.claude-plugin'];
const MAX = 8000;
// Eval runs spawn Claude sessions; this marks them so a nested Stop hook never re-runs the suite.
const GUARD = 'CDK_PLUGIN_EVAL';
const win = process.platform === 'win32';

// Drains stdin (event JSON is unused) so the writer never blocks.
async function readStdin() {
  for await (const chunk of process.stdin) void chunk;
}

// Hash of uncommitted and untracked changes under PATHS; '' when none, null outside git.
function fingerprint(cwd) {
  const git = (...args) => spawnSync('git', args, { cwd, maxBuffer: 1 << 30, windowsHide: true });
  const diff = git('diff', 'HEAD', '--binary', '--', ...PATHS);
  const untracked = git('ls-files', '-o', '--exclude-standard', '-z', '--', ...PATHS);
  if (diff.error || diff.status !== 0 || untracked.status !== 0) return null;
  const files = untracked.stdout.toString().split('\0').filter(Boolean);
  if (!diff.stdout.length && !files.length) return '';
  const hash = createHash('sha256').update(diff.stdout);
  for (const file of files.sort()) {
    hash.update(`\0${file}\0`);
    try {
      hash.update(readFileSync(join(cwd, file)));
    } catch {
      // Removed since listing; the name still counts.
    }
  }
  return hash.digest('hex');
}

const children = new Set();
// Total budget; below the hook `timeout` (3600 s) so this script kills the eval tree and reports it.
const BUDGET = 3_300_000;
const deadline = Date.now() + BUDGET;

function kill(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  // Kill the whole tree: eval spawns Claude sessions that outlive a killed parent.
  if (win) spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true });
  else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Group already gone.
    }
  }
}

function claude(args, cwd) {
  return new Promise((resolve) => {
    const opts = { cwd, env: { ...process.env, [GUARD]: '1', NO_COLOR: '1' }, windowsHide: true };
    // claude is a .cmd shim on Windows, which needs a shell; args are fixed literals. POSIX: own group for kill().
    const child = win
      ? spawn('claude', args, { ...opts, shell: true })
      : spawn('claude', args, { ...opts, detached: true });
    children.add(child);
    let out = '';
    const onData = (chunk) => (out = (out + chunk).slice(-MAX * 4));
    child.stdout.setEncoding('utf8').on('data', onData);
    child.stderr.setEncoding('utf8').on('data', onData);
    const timer = setTimeout(
      () => {
        out += `
timed out after ${BUDGET / 1000}s total`;
        kill(child);
      },
      Math.max(0, deadline - Date.now())
    );
    const done = (status, error) => {
      clearTimeout(timer);
      children.delete(child);
      resolve({ status, out: [out.trim(), error?.message].filter(Boolean).join('\n') });
    };
    child.on('error', (err) => done(null, err));
    child.on('close', (code, sig) => done(code ?? sig));
  });
}

// Failing `with` runs from the eval JSON, one line per case with the failing graders.
function failures(file) {
  let result;
  try {
    result = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
  return (result.cases ?? []).flatMap((c) => {
    const runs = c.arms?.with ?? [];
    const bad = runs.flatMap((r) => [
      ...(r.error ? [`error: ${r.error}`] : []),
      ...(r.graders ?? []).filter((g) => g.scored && !g.passed).map((g) => `${g.name}: ${g.explanation}`)
    ]);
    return bad.length ? [`- ${c.name} (${c.dir}): ${[...new Set(bad)].join('; ')}`] : [];
  });
}

// Returns the failure summary, or '' when validate and every eval case pass.
async function check(cwd) {
  const validate = await claude(['plugin', 'validate', '--strict', '.'], cwd);
  if (validate.status !== 0 || /warn/i.test(validate.out)) {
    return `claude plugin validate --strict . failed:\n${validate.out}`;
  }
  const dir = mkdtempSync(join(tmpdir(), 'cdk-plugin-eval-'));
  try {
    const json = join(dir, 'result.json');
    const run = await claude(
      ['plugin', 'eval', '.', '--trust-plugin', '--scaffold', '--no-publish', '-j', '4', '--json', json],
      cwd
    );
    const failed = failures(json);
    if (run.status === 0 && !failed.length) return '';
    const detail = failed.join('\n') || run.out.split('\n').slice(-40).join('\n');
    return `claude plugin eval . failed (exit ${run.status}):\n${detail}`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  // Kill the eval tree if Claude Code stops the hook.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.on(sig, () => {
      for (const child of children) kill(child);
      process.exit(1);
    });
  }
  await readStdin();
  if (process.env[GUARD]) return;
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const fp = fingerprint(cwd);
  const state = join(tmpdir(), `cdk-plugin-eval-${createHash('sha256').update(cwd).digest('hex').slice(0, 16)}`);
  let last = null;
  try {
    last = readFileSync(state, 'utf8');
  } catch {
    // First run.
  }
  // Skip unchanged trees: Q&A turns cost nothing and Claude can stop once it stops editing.
  if (fp === null || fp === last || (last === null && fp === '')) return;
  const problem = await check(cwd);
  // Recorded after the run, so a killed run re-runs next time.
  writeFileSync(state, fp);
  if (problem) {
    process.stderr.write(
      `${problem.slice(-MAX)}\nFix every issue, error, and warning; the plugin eval re-runs when Claude next finishes.`
    );
    process.exit(2);
  }
}

await main();
