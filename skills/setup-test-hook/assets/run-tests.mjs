// Stop hook: run the project's unit test suites before Claude can finish a turn.
// Groups run in order, suites in a group run in parallel; the first failure or warning stops all and blocks Claude.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

// Written by /cdk:setup-test-hook. Suite: { name, cmd, args, cwd? (relative to project), env?, warn? (RegExp, no `g` flag),
// inputs? (git pathspecs relative to cwd; default ['.']) }. A suite whose inputs and command are unchanged since it last passed is skipped.
const GROUPS = [];

const MAX = 8000;
// Claude Code caps systemMessage at 10,000 characters.
const MESSAGE_MAX = 10_000;
// Total budget for all groups in ms: the hook `timeout` minus 60 s, so this script reports the timeout itself.
// Written by /cdk:setup-test-hook from the chosen hook timeout (default 180 s).
const TIMEOUT = 120_000;
// Live progress for `tail -f`; hook output is shown only after the hook exits.
const LOG = '.claude/hooks/run-tests.log';
const GIT_TIMEOUT = 120_000;

// Real side effects; tests pass stubs. `groups` and `timeout` carry the two constants the skill rewrites.
const defaults = {
  groups: GROUPS,
  timeout: TIMEOUT,
  win: process.platform === 'win32',
  env: process.env,
  cwd: () => process.cwd(),
  now: () => Date.now(),
  spawn,
  spawnSync,
  readFile: readFileSync,
  writeFile: writeFileSync,
  appendFile: appendFileSync,
  realpath: realpathSync,
  tmpdir,
  killGroup: (pid) => process.kill(-pid, 'SIGKILL'),
  onSignal: (sig, fn) => process.on(sig, fn),
  exit: (code) => process.exit(code),
  stdout: (text) => process.stdout.write(text),
  readStdin: async () => {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data;
  }
};

// Per-run state: live children, progress lines, log file, and the deadline for all groups.
export function createContext(deps = defaults) {
  return { deps, children: new Set(), lines: [], logPath: null, deadline: deps.now() + deps.timeout };
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

function git(cwd, deps, ...args) {
  return deps.spawnSync('git', args, { cwd, maxBuffer: 1 << 30, timeout: GIT_TIMEOUT, windowsHide: true });
}

// Adds each file's name and content to the hash; unreadable or removed files still count by name.
export function hashFiles(hash, cwd, files, deps = defaults) {
  for (const file of files.sort()) {
    hash.update(`\0${file}\0`);
    try {
      hash.update(deps.readFile(join(cwd, file)));
    } catch {
      // Removed since listing.
    }
  }
  return hash.digest('hex');
}

const list = (res) => res.stdout.toString().split('\0').filter(Boolean);

// Hash of the suite definition, the index blob ids of its tracked inputs, and the content of only the modified or
// untracked inputs, so unchanged files are never read. null outside git.
export function suiteHash(suite, cwd, deps = defaults) {
  const dir = resolvePath(cwd, suite.cwd ?? '.');
  const inputs = suite.inputs?.length ? suite.inputs : ['.'];
  const spec = ['--', ...inputs, `:(top,exclude)${LOG}`];
  const staged = git(dir, deps, 'ls-files', '-s', '-z', ...spec);
  const changed = git(dir, deps, 'ls-files', '-mo', '--exclude-standard', '-z', ...spec);
  if (staged.error || staged.status !== 0 || changed.error || changed.status !== 0) return null;
  const def = JSON.stringify([suite.cmd, suite.args, suite.cwd, suite.env, String(suite.warn), inputs]);
  return hashFiles(createHash('sha256').update(def).update(staged.stdout), dir, list(changed), deps);
}

// Loop guard over the affected tests only: hash of every suite's inputs, so edits outside them never run the hook.
// null outside git.
export function fingerprint(cwd, deps = defaults) {
  const hash = createHash('sha256');
  for (const suite of deps.groups.flat()) {
    const one = suiteHash(suite, cwd, deps);
    if (one === null) return null;
    hash.update(`${suite.name}\0${one}\0`);
  }
  return hash.digest('hex');
}

export function commandLine(suite) {
  const env = Object.entries(suite.env ?? {}).map(([k, v]) => `${k}=${v}`);
  const line = [...env, suite.cmd, ...(suite.args ?? [])].join(' ');
  return suite.cwd ? `cd ${suite.cwd} && ${line}` : line;
}

export function progress(ctx, line) {
  ctx.lines.push(line);
  if (!ctx.logPath) return;
  try {
    ctx.deps.appendFile(ctx.logPath, `${line}\n`);
  } catch {
    // Log dir missing or read-only; the final systemMessage still carries every line.
  }
}

export function kill(child, deps = defaults) {
  if (!child.pid) return;
  // Kill the whole tree: runners leave workers and servers that outlive the parent.
  if (!deps.win) {
    try {
      deps.killGroup(child.pid);
    } catch {
      // Group already gone.
    }
  } else if (child.exitCode === null && child.signalCode === null) {
    deps.spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { timeout: 30_000, windowsHide: true });
  }
}

// cmd.exe needs backslash paths and quoted args; Windows runners are .cmd shims, so they need a shell.
export function winLine(cmd, args) {
  const quote = (a) => (/[\s"&|<>^()%!]/.test(a) ? `"${a.replaceAll('"', '""')}"` : a);
  return [cmd.replaceAll('/', '\\'), ...args].map(quote).join(' ');
}

export function run(suite, cwd, signal, ctx) {
  const { deps } = ctx;
  return new Promise((resolve) => {
    const env = { ...deps.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0', ...suite.env };
    const args = suite.args ?? [];
    const opts = { cwd: resolvePath(cwd, suite.cwd ?? '.'), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true };
    const start = deps.now();
    progress(ctx, `▶ started ${suite.name}: ${commandLine(suite)}`);
    // POSIX: own process group so kill() reaches the whole tree.
    let child;
    try {
      child = deps.win
        ? deps.spawn(winLine(suite.cmd, args), { ...opts, shell: true })
        : deps.spawn(suite.cmd, args, { ...opts, detached: true });
    } catch (err) {
      // Some failures (ENOEXEC: a script with no shebang) throw synchronously instead of emitting 'error'.
      progress(ctx, `✖ failed ${suite.name} (${err.message}) after 0.0s: ${commandLine(suite)}`);
      resolve({ suite, ok: false, reason: err.message, out: '' });
      return;
    }
    ctx.children.add(child);
    let out = '';
    let done = false;
    const finish = (ok, reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      kill(child, deps);
      ctx.children.delete(child);
      const secs = ((deps.now() - start) / 1000).toFixed(1);
      if (reason === 'aborted') progress(ctx, `■ stopped ${suite.name} (another suite failed): ${commandLine(suite)}`);
      else if (ok) progress(ctx, `✔ completed ${suite.name} in ${secs}s: ${commandLine(suite)}`);
      else progress(ctx, `✖ failed ${suite.name} (${reason}) after ${secs}s: ${commandLine(suite)}`);
      resolve({ suite, ok, reason, out: out.slice(-MAX) });
    };
    const onAbort = () => finish(true, 'aborted');
    const timer = setTimeout(
      () => finish(false, `timed out after ${deps.timeout / 1000}s total`),
      Math.max(0, ctx.deadline - deps.now())
    );
    signal.addEventListener('abort', onAbort);
    const onData = (chunk) => {
      out += chunk;
      if (out.length > MAX * 4) {
        // Trim to a line start, so a cut line never matches a `^` warning pattern.
        out = out.slice(-MAX * 4);
        out = out.slice(out.indexOf('\n') + 1);
      }
      if (suite.warn?.test(out)) finish(false, 'warning in output');
    };
    child.stdout.setEncoding('utf8').on('data', onData);
    child.stderr.setEncoding('utf8').on('data', onData);
    child.on('error', (err) => finish(false, err.message));
    child.on('close', (code, sig) => finish(code === 0, code === 0 ? '' : `exit ${code ?? sig}`));
  });
}

export function runGroup(group, cwd, cache, force, ctx) {
  const ctrl = new AbortController();
  return new Promise((resolve) => {
    const todo = [];
    for (const suite of group) {
      const hash = suiteHash(suite, cwd, ctx.deps);
      if (!force && hash !== null && cache[suite.name] === hash)
        progress(ctx, `↷ cached ${suite.name}: ${commandLine(suite)}`);
      else todo.push({ suite, hash });
    }
    let left = todo.length;
    if (!left) resolve(null);
    for (const { suite, hash } of todo) {
      run(suite, cwd, ctrl.signal, ctx).then((r) => {
        // Re-hash after the pass, so untracked files the suite writes into its inputs do not miss the cache next time.
        if (r.ok && r.reason !== 'aborted' && hash !== null)
          cache[suite.name] = suiteHash(suite, cwd, ctx.deps) ?? hash;
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
export const cap = (text) => (text.length > MESSAGE_MAX ? `…${text.slice(-(MESSAGE_MAX - 1))}` : text);

export async function main(deps = defaults) {
  const ctx = createContext(deps);
  // Detached children outlive this process, so kill them if Claude Code stops the hook.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    deps.onSignal(sig, () => {
      for (const child of ctx.children) kill(child, deps);
      deps.exit(1);
    });
  }
  const event = parseEvent(await deps.readStdin());
  const cwd = deps.env.CLAUDE_PROJECT_DIR || deps.cwd();
  const force = deps.env.CDK_RUN_TESTS_FORCE === '1';
  // Stop fires every turn: skip when no suite input changed since the last run, so Q&A and non-test edits cost nothing
  // and Claude can stop once it makes no further edits (the docs warn a Stop hook can loop forever).
  const fp = fingerprint(cwd, deps);
  // Real path, so symlinked spellings of one project (/tmp vs /private/tmp) share state and cache.
  let real = cwd;
  try {
    real = deps.realpath(cwd);
  } catch {
    // Missing dir; hash the given path.
  }
  const id = createHash('sha256').update(real).digest('hex').slice(0, 16);
  const state = join(deps.tmpdir(), `cdk-run-tests-${id}`);
  const cacheFile = join(deps.tmpdir(), `cdk-run-tests-${id}.json`);
  let last = null;
  try {
    last = deps.readFile(state, 'utf8');
  } catch {
    // First run.
  }
  // CDK_RUN_TESTS_FORCE=1 runs every suite regardless of changes and cache, for smoke tests.
  const skip = fp === null ? event.stop_hook_active === true : fp === last;
  if (skip && !force) return;
  let cache = {};
  try {
    cache = JSON.parse(deps.readFile(cacheFile, 'utf8'));
  } catch {
    // No cache yet.
  }
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  ctx.logPath = join(cwd, LOG);
  try {
    deps.writeFile(ctx.logPath, '');
  } catch {
    ctx.logPath = null;
  }
  // Record the state after the run, so untracked files the suites write do not trigger a rerun.
  // A write failure must not crash the hook, or a failing suite would never block.
  const record = () => {
    try {
      if (fp !== null) deps.writeFile(state, fingerprint(cwd, deps) ?? '');
      deps.writeFile(cacheFile, JSON.stringify(cache));
    } catch {
      // Temp dir not writable; the next Stop re-runs the suites.
    }
  };
  for (const group of deps.groups) {
    const fail = await runGroup(group, cwd, cache, force, ctx);
    if (!fail) continue;
    record();
    const reason =
      `Test suite "${fail.suite.name}" failed (${fail.reason}): ${commandLine(fail.suite)}\n${fail.out.trim()}\n` +
      `Fix every failing test, error, and warning; run only the affected unit tests. This hook runs again only after you edit a suite input; it then reruns the failed suite and suites whose inputs changed.`;
    deps.stdout(JSON.stringify({ decision: 'block', reason, systemMessage: cap(ctx.lines.join('\n')) }));
    return;
  }
  record();
  if (ctx.lines.length) deps.stdout(JSON.stringify({ systemMessage: cap(ctx.lines.join('\n')) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
