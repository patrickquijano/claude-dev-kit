import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { describe, test } from 'node:test';
import {
  cap,
  commandLine,
  createContext,
  fingerprint,
  hashFiles,
  kill,
  main,
  parseEvent,
  progress,
  run,
  runGroup,
  suiteHash,
  winLine
} from '../../../../../skills/setup-test-hook/assets/run-tests.mjs';

// A stand-in for a spawned process: emit 'data' on stdout/stderr and 'close' to drive it.
function fakeChild(pid = 42) {
  const child = new EventEmitter();
  for (const name of ['stdout', 'stderr']) {
    const s = new EventEmitter();
    s.setEncoding = () => s;
    child[name] = s;
  }
  return Object.assign(child, { pid, exitCode: null, signalCode: null });
}

// Builds stub deps. `staged`/`changed` are the stdout of the two `git ls-files` calls (null = git fails).
function makeDeps({
  staged = 'blob',
  changed = '',
  files = {},
  groups = [],
  win = false,
  env = {},
  stdin = '{}',
  timeout = 120_000
} = {}) {
  const calls = { sync: [], spawn: [], kill: [], writes: {}, appends: [], stdout: [], signals: {}, exits: [] };
  let clock = 0;
  const children = [];
  const deps = {
    groups,
    timeout,
    win,
    env: { CLAUDE_PROJECT_DIR: '/proj', ...env },
    cwd: () => '/cwd',
    now: () => (clock += 100),
    spawn: (cmd, args, opts) => {
      calls.spawn.push({ cmd, args, opts });
      const child = fakeChild(100 + children.length);
      children.push(child);
      return child;
    },
    spawnSync: (cmd, args) => {
      calls.sync.push([cmd, ...args]);
      if (cmd !== 'git') return { status: 0, stdout: Buffer.alloc(0) };
      const out = args[0] === 'ls-files' && args[1] === '-s' ? staged : changed;
      return out === null ? { status: 1, stdout: Buffer.alloc(0) } : { status: 0, stdout: Buffer.from(out) };
    },
    readFile: (path) => {
      if (!(path in files) && !(path in calls.writes)) throw new Error(`ENOENT ${path}`);
      return path in calls.writes ? calls.writes[path] : files[path];
    },
    writeFile: (path, data) => {
      calls.writes[path] = String(data);
    },
    appendFile: (path, data) => calls.appends.push([path, data]),
    realpath: (p) => p,
    tmpdir: () => '/tmp',
    killGroup: (pid) => calls.kill.push(pid),
    onSignal: (sig, fn) => {
      calls.signals[sig] = fn;
    },
    exit: (code) => calls.exits.push(code),
    stdout: (text) => calls.stdout.push(text),
    readStdin: async () => stdin
  };
  return { deps, calls, children };
}

const suite = (over = {}) => ({ name: 's', cmd: 'node', args: ['t.js'], ...over });
const sha = (...parts) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest('hex');
};

describe('createContext', () => {
  test('sets the deadline to now plus the timeout', () => {
    // Arrange
    const { deps } = makeDeps({ timeout: 5000 });
    // Act
    const ctx = createContext(deps);
    // Assert
    assert.equal(ctx.deadline, 100 + 5000);
  });

  test('starts with no children, lines, or log path', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const ctx = createContext(deps);
    // Assert
    assert.equal(ctx.children.size, 0);
    assert.deepEqual(ctx.lines, []);
    assert.equal(ctx.logPath, null);
  });

  test('keeps the given deps', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const ctx = createContext(deps);
    // Assert
    assert.equal(ctx.deps, deps);
  });

  test('gives each call its own state', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const a = createContext(deps);
    const b = createContext(deps);
    // Assert
    assert.notEqual(a.lines, b.lines);
  });
});

describe('parseEvent', () => {
  test('returns the parsed object', () => {
    // Arrange
    const data = '{"stop_hook_active":true}';
    // Act
    const result = parseEvent(data);
    // Assert
    assert.deepEqual(result, { stop_hook_active: true });
  });

  test('returns an empty object for null', () => {
    // Arrange
    const data = 'null';
    // Act
    const result = parseEvent(data);
    // Assert
    assert.deepEqual(result, {});
  });

  test('returns an empty object for invalid JSON', () => {
    // Arrange
    const data = '';
    // Act
    const result = parseEvent(data);
    // Assert
    assert.deepEqual(result, {});
  });

  test('returns an empty object for a non-object JSON value', () => {
    // Arrange
    const data = '[1]';
    // Act
    const result = parseEvent(data);
    // Assert
    assert.deepEqual(result, {});
  });
});

describe('hashFiles', () => {
  test('hashes sorted names and contents', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/d/a': 'A', '/d/b': 'B' } });
    // Act
    const result = hashFiles(createHash('sha256'), '/d', ['b', 'a'], deps);
    // Assert
    assert.equal(result, sha('\0a\0', 'A', '\0b\0', 'B'));
  });

  test('changes when a file content changes', () => {
    // Arrange
    const one = makeDeps({ files: { '/d/a': 'A' } }).deps;
    const two = makeDeps({ files: { '/d/a': 'Z' } }).deps;
    // Act
    const a = hashFiles(createHash('sha256'), '/d', ['a'], one);
    const b = hashFiles(createHash('sha256'), '/d', ['a'], two);
    // Assert
    assert.notEqual(a, b);
  });

  test('counts an unreadable file by name only', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = hashFiles(createHash('sha256'), '/d', ['gone'], deps);
    // Assert
    assert.equal(result, sha('\0gone\0'));
  });

  test('returns the empty-input digest for no files', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = hashFiles(createHash('sha256'), '/d', [], deps);
    // Assert
    assert.equal(result, sha(''));
  });
});

describe('suiteHash', () => {
  test('returns a hex digest when git lists the inputs', () => {
    // Arrange
    const { deps } = makeDeps({ staged: '100644 abc 0\tt.js\0', changed: '' });
    // Act
    const result = suiteHash(suite(), '/proj', deps);
    // Assert
    assert.match(result, /^[0-9a-f]{64}$/);
  });

  test('differs when the suite command differs', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const a = suiteHash(suite(), '/proj', deps);
    const b = suiteHash(suite({ cmd: 'deno' }), '/proj', deps);
    // Assert
    assert.notEqual(a, b);
  });

  test('returns null when git ls-files fails', () => {
    // Arrange
    const { deps } = makeDeps({ staged: null });
    // Act
    const result = suiteHash(suite(), '/proj', deps);
    // Assert
    assert.equal(result, null);
  });

  test('returns null when the changed listing fails', () => {
    // Arrange
    const { deps } = makeDeps({ changed: null });
    // Act
    const result = suiteHash(suite(), '/proj', deps);
    // Assert
    assert.equal(result, null);
  });

  test('passes the suite inputs and excludes the log file', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    suiteHash(suite({ inputs: ['src'] }), '/proj', deps);
    // Assert
    assert.deepEqual(calls.sync[0].slice(-3), ['--', 'src', ':(top,exclude).claude/hooks/run-tests.log']);
  });
});

describe('fingerprint', () => {
  test('returns a digest over every suite', () => {
    // Arrange
    const { deps } = makeDeps({ groups: [[suite({ name: 'a' })], [suite({ name: 'b' })]] });
    // Act
    const result = fingerprint('/proj', deps);
    // Assert
    assert.match(result, /^[0-9a-f]{64}$/);
  });

  test('returns the empty digest when there are no suites', () => {
    // Arrange
    const { deps } = makeDeps({ groups: [] });
    // Act
    const result = fingerprint('/proj', deps);
    // Assert
    assert.equal(result, sha(''));
  });

  test('returns null when any suite hash is null', () => {
    // Arrange
    const { deps } = makeDeps({ groups: [[suite()]], staged: null });
    // Act
    const result = fingerprint('/proj', deps);
    // Assert
    assert.equal(result, null);
  });

  test('depends on the suite names', () => {
    // Arrange
    const a = makeDeps({ groups: [[suite({ name: 'a' })]] }).deps;
    const b = makeDeps({ groups: [[suite({ name: 'b' })]] }).deps;
    // Act
    const one = fingerprint('/proj', a);
    const two = fingerprint('/proj', b);
    // Assert
    assert.notEqual(one, two);
  });
});

describe('commandLine', () => {
  test('joins the command and arguments', () => {
    // Arrange
    const s = suite({ args: ['--ci'] });
    // Act
    const result = commandLine(s);
    // Assert
    assert.equal(result, 'node --ci');
  });

  test('prefixes env assignments and the working directory', () => {
    // Arrange
    const s = suite({ env: { A: '1' }, cwd: 'web' });
    // Act
    const result = commandLine(s);
    // Assert
    assert.equal(result, 'cd web && A=1 node t.js');
  });

  test('handles a suite without args', () => {
    // Arrange
    const s = { name: 'x', cmd: 'pytest' };
    // Act
    const result = commandLine(s);
    // Assert
    assert.equal(result, 'pytest');
  });

  test('omits the cd prefix when cwd is empty', () => {
    // Arrange
    const s = suite({ cwd: '' });
    // Act
    const result = commandLine(s);
    // Assert
    assert.equal(result, 'node t.js');
  });
});

describe('progress', () => {
  test('records the line in memory', () => {
    // Arrange
    const ctx = createContext(makeDeps().deps);
    // Act
    progress(ctx, 'hello');
    // Assert
    assert.deepEqual(ctx.lines, ['hello']);
  });

  test('appends the line to the log file when a log path is set', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    const ctx = createContext(deps);
    ctx.logPath = '/log';
    // Act
    progress(ctx, 'hi');
    // Assert
    assert.deepEqual(calls.appends, [['/log', 'hi\n']]);
  });

  test('does not touch the log when no path is set', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    const ctx = createContext(deps);
    // Act
    progress(ctx, 'hi');
    // Assert
    assert.equal(calls.appends.length, 0);
  });

  test('keeps the line when appending throws', () => {
    // Arrange
    const { deps } = makeDeps();
    deps.appendFile = () => {
      throw new Error('EROFS');
    };
    const ctx = createContext(deps);
    ctx.logPath = '/log';
    // Act
    progress(ctx, 'hi');
    // Assert
    assert.deepEqual(ctx.lines, ['hi']);
  });
});

describe('kill', () => {
  test('kills the process group on POSIX', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    kill(fakeChild(7), deps);
    // Assert
    assert.deepEqual(calls.kill, [7]);
  });

  test('runs taskkill on Windows for a live child', () => {
    // Arrange
    const { deps, calls } = makeDeps({ win: true });
    // Act
    kill(fakeChild(7), deps);
    // Assert
    assert.deepEqual(calls.sync[0], ['taskkill', '/T', '/F', '/PID', '7']);
  });

  test('does nothing for a child without a pid', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    const child = fakeChild(0);
    // Act
    kill(child, deps);
    // Assert
    assert.deepEqual(calls.kill, []);
  });

  test('ignores a vanished process group', () => {
    // Arrange
    const { deps } = makeDeps();
    deps.killGroup = () => {
      throw new Error('ESRCH');
    };
    // Act
    const act = () => kill(fakeChild(7), deps);
    // Assert
    assert.doesNotThrow(act);
  });

  test('skips taskkill on Windows once the child has exited', () => {
    // Arrange
    const { deps, calls } = makeDeps({ win: true });
    const child = fakeChild(7);
    child.exitCode = 0;
    // Act
    kill(child, deps);
    // Assert
    assert.equal(calls.sync.length, 0);
  });
});

describe('winLine', () => {
  test('maps slashes in the command to backslashes', () => {
    // Arrange
    const cmd = './gradlew';
    // Act
    const result = winLine(cmd, []);
    // Assert
    assert.equal(result, '.\\gradlew');
  });

  test('quotes arguments with spaces and doubles their quotes', () => {
    // Arrange
    const args = ['a b', 'say "hi"'];
    // Act
    const result = winLine('x', args);
    // Assert
    assert.equal(result, 'x "a b" "say ""hi"""');
  });

  test('leaves plain arguments unquoted', () => {
    // Arrange
    const args = ['--ci', 'test'];
    // Act
    const result = winLine('npm', args);
    // Assert
    assert.equal(result, 'npm --ci test');
  });

  test('quotes arguments containing cmd metacharacters', () => {
    // Arrange
    const args = ['a&b'];
    // Act
    const result = winLine('x', args);
    // Assert
    assert.equal(result, 'x "a&b"');
  });
});

describe('cap', () => {
  test('returns short text unchanged', () => {
    // Arrange
    const text = 'short';
    // Act
    const result = cap(text);
    // Assert
    assert.equal(result, 'short');
  });

  test('returns text of exactly the limit unchanged', () => {
    // Arrange
    const text = 'x'.repeat(10_000);
    // Act
    const result = cap(text);
    // Assert
    assert.equal(result.length, 10_000);
  });

  test('keeps the tail with an ellipsis when over the limit', () => {
    // Arrange
    const text = `${'a'.repeat(10_000)}TAIL`;
    // Act
    const result = cap(text);
    // Assert
    assert.equal(result.length, 10_000);
    assert.ok(result.startsWith('…') && result.endsWith('TAIL'));
  });

  test('drops the head of very long text', () => {
    // Arrange
    const text = `HEAD${'b'.repeat(20_000)}`;
    // Act
    const result = cap(text);
    // Assert
    assert.ok(!result.includes('HEAD'));
  });
});

describe('run', () => {
  const start = (s, over = {}) => {
    const harness = makeDeps(over);
    const ctx = createContext(harness.deps);
    const ctrl = new AbortController();
    const promise = run(s, '/proj', ctrl.signal, ctx);
    return { ...harness, ctx, ctrl, promise, child: harness.children[0] };
  };

  test('resolves ok when the process exits 0', async () => {
    // Arrange
    const h = start(suite());
    // Act
    h.child.emit('close', 0, null);
    const result = await h.promise;
    // Assert
    assert.equal(result.ok, true);
    assert.equal(result.reason, '');
  });

  test('spawns detached with CI env and the suite cwd on POSIX', async () => {
    // Arrange
    const h = start(suite({ cwd: 'web', env: { A: '1' } }));
    // Act
    h.child.emit('close', 0, null);
    await h.promise;
    // Assert
    const call = h.calls.spawn[0];
    assert.equal(call.opts.detached, true);
    assert.equal(call.opts.cwd, '/proj/web');
    assert.deepEqual([call.opts.env.CI, call.opts.env.A], ['1', '1']);
  });

  test('resolves not ok with the exit code when the process fails, keeping its output', async () => {
    // Arrange
    const h = start(suite());
    // Act
    h.child.stdout.emit('data', 'boom');
    h.child.emit('close', 3, null);
    const result = await h.promise;
    // Assert
    assert.deepEqual([result.ok, result.reason, result.out], [false, 'exit 3', 'boom']);
  });

  test('fails with "warning in output" when the warn pattern matches', async () => {
    // Arrange
    const h = start(suite({ warn: /WARN/ }));
    // Act
    h.child.stderr.emit('data', 'WARN deprecated');
    const result = await h.promise;
    // Assert
    assert.deepEqual([result.ok, result.reason], [false, 'warning in output']);
  });

  test('fails with the error message when the process emits error', async () => {
    // Arrange
    const h = start(suite());
    // Act
    h.child.emit('error', new Error('ENOENT'));
    const result = await h.promise;
    // Assert
    assert.deepEqual([result.ok, result.reason], [false, 'ENOENT']);
  });

  test('fails without a child when spawn throws synchronously', async () => {
    // Arrange
    const harness = makeDeps();
    harness.deps.spawn = () => {
      throw new Error('ENOEXEC');
    };
    const ctx = createContext(harness.deps);
    // Act
    const result = await run(suite(), '/proj', new AbortController().signal, ctx);
    // Assert
    assert.deepEqual([result.ok, result.reason], [false, 'ENOEXEC']);
  });

  test('resolves ok with reason aborted when the signal aborts', async () => {
    // Arrange
    const h = start(suite());
    // Act
    h.ctrl.abort();
    const result = await h.promise;
    // Assert
    assert.deepEqual([result.ok, result.reason], [true, 'aborted']);
  });

  test('fails with a timeout reason when the budget runs out', async () => {
    // Arrange
    const h = start(suite(), { timeout: 20 });
    // Act
    const result = await h.promise;
    // Assert
    assert.deepEqual([result.ok, result.reason], [false, 'timed out after 0.02s total']);
  });

  test('uses a shell with a quoted line on Windows', async () => {
    // Arrange
    const h = start(suite({ cmd: './gradlew', args: ['a b'] }), { win: true });
    // Act
    h.child.emit('close', 0, null);
    await h.promise;
    // Assert
    assert.equal(h.calls.spawn[0].cmd, '.\\gradlew "a b"');
    assert.equal(h.calls.spawn[0].args.shell, true);
  });
});

describe('runGroup', () => {
  const group = (names, over = {}) => {
    const harness = makeDeps({ groups: [], ...over });
    const ctx = createContext(harness.deps);
    const suites = names.map((name) => suite({ name }));
    const cache = over.cache ?? {};
    const promise = runGroup(suites, '/proj', cache, over.force ?? false, ctx);
    return { ...harness, ctx, cache, promise };
  };

  test('resolves null and caches the hash when every suite passes', async () => {
    // Arrange
    const h = group(['a', 'b']);
    // Act
    for (const c of h.children) c.emit('close', 0, null);
    const result = await h.promise;
    // Assert
    assert.equal(result, null);
    assert.deepEqual(Object.keys(h.cache), ['a', 'b']);
  });

  test('resolves null at once and logs a cached line when the hash matches the cache', async () => {
    // Arrange
    const seed = group(['a']);
    seed.children[0].emit('close', 0, null);
    await seed.promise;
    const h = group(['a'], { cache: { ...seed.cache } });
    // Act
    const result = await h.promise;
    // Assert
    assert.equal(result, null);
    assert.equal(h.children.length, 0);
    assert.match(h.ctx.lines[0], /^↷ cached a/);
  });

  test('resolves the failing result and drops its cache entry', async () => {
    // Arrange
    const h = group(['a'], { cache: { a: 'old' } });
    // Act
    h.children[0].emit('close', 1, null);
    const result = await h.promise;
    // Assert
    assert.equal(result.suite.name, 'a');
    assert.equal('a' in h.cache, false);
  });

  test('aborts the other suites when one fails', async () => {
    // Arrange
    const h = group(['a', 'b']);
    // Act
    h.children[0].emit('close', 1, null);
    await h.promise;
    // Assert
    assert.ok(h.ctx.lines.some((l) => l.startsWith('■ stopped b')));
  });

  test('runs a cached suite again when force is set', async () => {
    // Arrange
    const seed = group(['a']);
    seed.children[0].emit('close', 0, null);
    await seed.promise;
    const h = group(['a'], { cache: { ...seed.cache }, force: true });
    // Act
    h.children[0].emit('close', 0, null);
    await h.promise;
    // Assert
    assert.equal(h.children.length, 1);
  });

  test('does not cache a suite when git gives no hash', async () => {
    // Arrange
    const h = group(['a'], { staged: null });
    // Act
    h.children[0].emit('close', 0, null);
    await h.promise;
    // Assert
    assert.deepEqual(h.cache, {});
  });
});

describe('main', () => {
  const passing = [[suite({ name: 'a' })]];

  // Runs main and finishes each spawned child with the given exit codes, in spawn order.
  async function drive(h, codes) {
    const promise = main(h.deps);
    let seen = 0;
    while (seen < codes.length) {
      await new Promise((r) => setImmediate(r));
      while (seen < h.children.length && seen < codes.length) h.children[seen].emit('close', codes[seen++], null);
    }
    await promise;
  }

  test('prints a systemMessage and records state when every suite passes', async () => {
    // Arrange
    const h = makeDeps({ groups: passing });
    // Act
    await drive(h, [0]);
    // Assert
    assert.match(JSON.parse(h.calls.stdout[0]).systemMessage, /✔ completed a/);
    assert.ok(Object.keys(h.calls.writes).some((p) => p.startsWith('/tmp/cdk-run-tests-')));
  });

  test('blocks with the failing suite and stops later groups', async () => {
    // Arrange
    const h = makeDeps({ groups: [[suite({ name: 'a' })], [suite({ name: 'b' })]] });
    // Act
    await drive(h, [1]);
    // Assert
    const out = JSON.parse(h.calls.stdout[0]);
    assert.equal(out.decision, 'block');
    assert.match(out.reason, /Test suite "a" failed \(exit 1\)/);
    assert.equal(h.children.length, 1);
  });

  test('skips when the fingerprint matches the last recorded state', async () => {
    // Arrange
    const first = makeDeps({ groups: passing });
    await drive(first, [0]);
    const stateFile = Object.keys(first.calls.writes).find((p) => !p.endsWith('.json') && p.includes('cdk-run-tests-'));
    const h = makeDeps({ groups: passing, files: { [stateFile]: first.calls.writes[stateFile] } });
    // Act
    await main(h.deps);
    // Assert
    assert.equal(h.children.length, 0);
    assert.deepEqual(h.calls.stdout, []);
  });

  test('runs a suite anyway when CDK_RUN_TESTS_FORCE is 1', async () => {
    // Arrange
    const first = makeDeps({ groups: passing });
    await drive(first, [0]);
    const stateFile = Object.keys(first.calls.writes).find((p) => !p.endsWith('.json') && p.includes('cdk-run-tests-'));
    const h = makeDeps({
      groups: passing,
      env: { CDK_RUN_TESTS_FORCE: '1' },
      files: { [stateFile]: first.calls.writes[stateFile] }
    });
    // Act
    await drive(h, [0]);
    // Assert
    assert.equal(h.children.length, 1);
  });

  test('skips outside git when stop_hook_active is true', async () => {
    // Arrange
    const h = makeDeps({ groups: passing, staged: null, stdin: '{"stop_hook_active":true}' });
    // Act
    await main(h.deps);
    // Assert
    assert.equal(h.children.length, 0);
  });

  test('runs outside git when stop_hook_active is not set', async () => {
    // Arrange
    const h = makeDeps({ groups: passing, staged: null });
    // Act
    await drive(h, [0]);
    // Assert
    assert.equal(h.children.length, 1);
  });

  test('prints nothing for a project with no suites', async () => {
    // Arrange
    const h = makeDeps({ groups: [] });
    // Act
    await main(h.deps);
    // Assert
    assert.deepEqual(h.calls.stdout, []);
  });

  test('registers kill handlers for SIGTERM, SIGINT, and SIGHUP that exit 1', async () => {
    // Arrange
    const h = makeDeps({ groups: [] });
    // Act
    await main(h.deps);
    h.calls.signals.SIGTERM();
    // Assert
    assert.deepEqual(Object.keys(h.calls.signals), ['SIGTERM', 'SIGINT', 'SIGHUP']);
    assert.deepEqual(h.calls.exits, [1]);
  });

  test('ignores a corrupt cache file and a read-only temp dir', async () => {
    // Arrange
    const h = makeDeps({ groups: passing });
    h.deps.writeFile = () => {
      throw new Error('EROFS');
    };
    // Act
    await drive(h, [0]);
    // Assert
    assert.match(JSON.parse(h.calls.stdout[0]).systemMessage, /completed a/);
  });
});
