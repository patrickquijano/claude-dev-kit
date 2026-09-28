// Stop hook: run the project's unit test suites before Claude can finish a turn.
// Groups run in order, suites in a group run in parallel; the first failure or warning stops all and blocks Claude.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';

// Written by /cdk:setup-test-hook. Suite: { name, cmd, args, cwd? (relative to project), env?, warn? (RegExp, no `g` flag),
// inputs? (git pathspecs relative to cwd; default ['.']) }. A suite whose inputs and command are unchanged since it last passed is skipped.
const GROUPS = [];

const win = process.platform === 'win32';
const MAX = 8000;
// Claude Code caps systemMessage at 10,000 characters.
const MESSAGE_MAX = 10_000;
// Total budget for all groups in ms: the hook `timeout` minus 60 s, so this script reports the timeout itself.
// Written by /cdk:setup-test-hook from the chosen hook timeout (default 180 s).
const TIMEOUT = 120_000;
// Live progress for `tail -f`; hook output is shown only after the hook exits.
const LOG = '.claude/hooks/run-tests.log';
const deadline = Date.now() + TIMEOUT;
const children = new Set();
const lines = [];
let logPath = null;

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

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, maxBuffer: 1 << 30, windowsHide: true });
}

// Adds each file's name and content to the hash; unreadable or removed files still count by name.
function hashFiles(hash, cwd, files) {
  for (const file of files.sort()) {
    hash.update(`\0${file}\0`);
    try {
      hash.update(readFileSync(join(cwd, file)));
    } catch {
      // Removed since listing.
    }
  }
  return hash.digest('hex');
}

const list = (res) => res.stdout.toString().split('\0').filter(Boolean);

// Hash of the suite definition plus the content of every tracked or untracked file its inputs match; null outside git.
function suiteHash(suite, cwd) {
  const dir = resolvePath(cwd, suite.cwd ?? '.');
  const inputs = suite.inputs?.length ? suite.inputs : ['.'];
  const res = git(dir, 'ls-files', '-co', '--exclude-standard', '-z', '--', ...inputs, `:(top,exclude)${LOG}`);
  if (res.error || res.status !== 0) return null;
  const def = JSON.stringify([suite.cmd, suite.args, suite.cwd, suite.env, String(suite.warn), inputs]);
  return hashFiles(createHash('sha256').update(def), dir, list(res));
}

// Loop guard over the affected tests only: hash of every suite's inputs, so edits outside them never run the hook.
// null outside git.
function fingerprint(cwd) {
  const hash = createHash('sha256');
  for (const suite of GROUPS.flat()) {
    const one = suiteHash(suite, cwd);
    if (one === null) return null;
    hash.update(`${suite.name}\0${one}\0`);
  }
  return hash.digest('hex');
}

function commandLine(suite) {
  const env = Object.entries(suite.env ?? {}).map(([k, v]) => `${k}=${v}`);
  const line = [...env, suite.cmd, ...(suite.args ?? [])].join(' ');
  return suite.cwd ? `cd ${suite.cwd} && ${line}` : line;
}

function progress(line) {
  lines.push(line);
  if (!logPath) return;
  try {
    appendFileSync(logPath, `${line}\n`);
  } catch {
    // Log dir missing or read-only; the final systemMessage still carries every line.
  }
}

function kill(child) {
  if (!child.pid) return;
  // Kill the whole tree: runners leave workers and servers that outlive the parent.
  if (!win) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Group already gone.
    }
  } else if (child.exitCode === null && child.signalCode === null) {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true });
  }
}

// cmd.exe needs backslash paths and quoted args; Windows runners are .cmd shims, so they need a shell.
function winLine(cmd, args) {
  const quote = (a) => (/[\s"&|<>^()%!]/.test(a) ? `"${a.replaceAll('"', '""')}"` : a);
  return [cmd.replaceAll('/', '\\'), ...args].map(quote).join(' ');
}

function run(suite, cwd, signal) {
  return new Promise((resolve) => {
    const env = { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0', ...suite.env };
    const args = suite.args ?? [];
    const opts = { cwd: resolvePath(cwd, suite.cwd ?? '.'), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true };
    const start = Date.now();
    progress(`▶ started ${suite.name}: ${commandLine(suite)}`);
    // POSIX: own process group so kill() reaches the whole tree.
    const child = win
      ? spawn(winLine(suite.cmd, args), { ...opts, shell: true })
      : spawn(suite.cmd, args, { ...opts, detached: true });
    children.add(child);
    let out = '';
    let done = false;
    const finish = (ok, reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      kill(child);
      children.delete(child);
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      if (reason === 'aborted') progress(`■ stopped ${suite.name} (another suite failed): ${commandLine(suite)}`);
      else if (ok) progress(`✔ completed ${suite.name} in ${secs}s: ${commandLine(suite)}`);
      else progress(`✖ failed ${suite.name} (${reason}) after ${secs}s: ${commandLine(suite)}`);
      resolve({ suite, ok, reason, out: out.slice(-MAX) });
    };
    const onAbort = () => finish(true, 'aborted');
    const timer = setTimeout(
      () => finish(false, `timed out after ${TIMEOUT / 1000}s total`),
      Math.max(0, deadline - Date.now())
    );
    signal.addEventListener('abort', onAbort);
    const onData = (chunk) => {
      out = (out + chunk).slice(-MAX * 4);
      if (suite.warn?.test(out)) finish(false, 'warning in output');
    };
    child.stdout.setEncoding('utf8').on('data', onData);
    child.stderr.setEncoding('utf8').on('data', onData);
    child.on('error', (err) => finish(false, err.message));
    child.on('close', (code, sig) => finish(code === 0, code === 0 ? '' : `exit ${code ?? sig}`));
  });
}

function runGroup(group, cwd, cache, force) {
  const ctrl = new AbortController();
  return new Promise((resolve) => {
    const todo = [];
    for (const suite of group) {
      const hash = suiteHash(suite, cwd);
      if (!force && hash !== null && cache[suite.name] === hash)
        progress(`↷ cached ${suite.name}: ${commandLine(suite)}`);
      else todo.push({ suite, hash });
    }
    let left = todo.length;
    if (!left) resolve(null);
    for (const { suite, hash } of todo) {
      run(suite, cwd, ctrl.signal).then((r) => {
        // Re-hash after the pass, so untracked files the suite writes into its inputs do not miss the cache next time.
        if (r.ok && r.reason !== 'aborted' && hash !== null) cache[suite.name] = suiteHash(suite, cwd) ?? hash;
        if (!r.ok) delete cache[suite.name];
        if (!r.ok && !ctrl.signal.aborted) {
          ctrl.abort();
          resolve(r);
        }
        if (--left === 0) resolve(null);
      });
    }
  });
}

// Keeps the tail, where the failing suite is.
const cap = (text) => (text.length > MESSAGE_MAX ? `…${text.slice(-(MESSAGE_MAX - 1))}` : text);

async function main() {
  // Detached children outlive this process, so kill them if Claude Code stops the hook.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.on(sig, () => {
      for (const child of children) kill(child);
      process.exit(1);
    });
  }
  const event = await readEvent();
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const force = process.env.CDK_RUN_TESTS_FORCE === '1';
  // Stop fires every turn: skip when no suite input changed since the last run, so Q&A and non-test edits cost nothing
  // and Claude can stop once it makes no further edits (the docs warn a Stop hook can loop forever).
  const fp = fingerprint(cwd);
  // Real path, so symlinked spellings of one project (/tmp vs /private/tmp) share state and cache.
  let real = cwd;
  try {
    real = realpathSync(cwd);
  } catch {
    // Missing dir; hash the given path.
  }
  const id = createHash('sha256').update(real).digest('hex').slice(0, 16);
  const state = join(tmpdir(), `cdk-run-tests-${id}`);
  const cacheFile = join(tmpdir(), `cdk-run-tests-${id}.json`);
  let last = null;
  try {
    last = readFileSync(state, 'utf8');
  } catch {
    // First run.
  }
  // CDK_RUN_TESTS_FORCE=1 runs every suite regardless of changes and cache, for smoke tests.
  const skip = fp === null ? event.stop_hook_active === true : fp === last;
  if (skip && !force) return;
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  } catch {
    // No cache yet.
  }
  logPath = join(cwd, LOG);
  try {
    writeFileSync(logPath, '');
  } catch {
    logPath = null;
  }
  // Record the state after the run, so untracked files the suites write do not trigger a rerun.
  const record = () => {
    if (fp !== null) writeFileSync(state, fingerprint(cwd) ?? '');
    writeFileSync(cacheFile, JSON.stringify(cache));
  };
  for (const group of GROUPS) {
    const fail = await runGroup(group, cwd, cache, force);
    if (!fail) continue;
    record();
    const reason =
      `Test suite "${fail.suite.name}" failed (${fail.reason}): ${commandLine(fail.suite)}\n${fail.out.trim()}\n` +
      `Fix every failing test, error, and warning; run only the affected unit tests. When you finish, this hook re-runs only the failed suite and suites whose inputs changed.`;
    process.stdout.write(JSON.stringify({ decision: 'block', reason, systemMessage: cap(lines.join('\n')) }));
    return;
  }
  record();
  if (lines.length) process.stdout.write(JSON.stringify({ systemMessage: cap(lines.join('\n')) }));
}

await main();
