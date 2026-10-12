import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import {
  available,
  failureText,
  installed,
  isFile,
  keyOf,
  resolveStep,
  run,
  stepCommand,
  writeStdout
} from '../../../../../hooks/scripts/lib/tools.mjs';

const fsError = (code) => Object.assign(new Error(code), { code });

test('keyOf: returns the lowercased extension', () => {
  // Arrange
  const file = 'src/App.TSX';
  // Act
  const key = keyOf(file);
  // Assert
  assert.equal(key, 'tsx');
});

test('keyOf: maps Dockerfile and Dockerfile.* to dockerfile', () => {
  // Arrange
  const files = ['Dockerfile', 'docker/Dockerfile.prod'];
  // Act
  const keys = files.map(keyOf);
  // Assert
  assert.deepEqual(keys, ['dockerfile', 'dockerfile']);
});

test('keyOf: does not treat Dockerfile.*.dockerignore as a Dockerfile', () => {
  // Arrange
  const file = 'Dockerfile.dockerignore';
  // Act
  const key = keyOf(file);
  // Assert
  assert.equal(key, 'dockerignore');
});

test('keyOf: returns an empty key for a file with no extension', () => {
  // Arrange
  const file = 'LICENSE';
  // Act
  const key = keyOf(file);
  // Assert
  assert.equal(key, '');
});

test('isFile: is true when stat reports a file', () => {
  // Arrange
  const deps = { statSync: () => ({ isFile: () => true }) };
  // Act
  const result = isFile('a.txt', deps);
  // Assert
  assert.equal(result, true);
});

test('isFile: is false when stat reports a directory', () => {
  // Arrange
  const deps = { statSync: () => ({ isFile: () => false }) };
  // Act
  const result = isFile('dir', deps);
  // Assert
  assert.equal(result, false);
});

test('isFile: is false when the file is missing', () => {
  // Arrange
  const deps = {
    statSync: () => {
      throw fsError('ENOENT');
    }
  };
  // Act
  const result = isFile('missing', deps);
  // Assert
  assert.equal(result, false);
});

test('isFile: rethrows an unexpected stat error', () => {
  // Arrange
  const deps = {
    statSync: () => {
      throw fsError('EIO');
    }
  };
  // Act
  const act = () => isFile('x', deps);
  // Assert
  assert.throws(act, { code: 'EIO' });
});

test('run: passes the command and arguments straight through off Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: false, env: { A: '1' }, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('eslint', ['--fix', 'a.js'], '/p', 5000, deps);
  // Assert
  assert.equal(result.status, 0);
  assert.deepEqual(calls[0].slice(0, 2), ['eslint', ['--fix', 'a.js']]);
  assert.equal(calls[0][2].cwd, '/p');
  assert.equal(calls[0][2].timeout, 5000);
  assert.deepEqual(calls[0][2].env, { A: '1', NO_COLOR: '1' });
  assert.equal(calls[0][2].shell, undefined);
});

test('run: quotes every argument and uses a shell on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  run('tool', ['a b'], '/p', 1000, deps);
  // Assert
  assert.equal(calls[0][0], '"tool"');
  assert.deepEqual(calls[0][1], ['"a b"']);
  assert.equal(calls[0][2].shell, true);
});

test('run: refuses an argument with a double quote on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a"b'], '/p', 1000, deps);
  // Assert
  assert.ok(result.error);
  assert.equal(calls.length, 0);
});

test('run: refuses an argument with a percent sign on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a%b'], '/p', 1000, deps);
  // Assert
  assert.ok(result.error);
  assert.equal(calls.length, 0);
});

test('run: refuses an argument with an exclamation mark on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a!b'], '/p', 1000, deps);
  // Assert
  assert.ok(result.error);
  assert.equal(calls.length, 0);
});

test('run: refuses an argument with a caret on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a^b'], '/p', 1000, deps);
  // Assert
  assert.ok(result.error);
  assert.equal(calls.length, 0);
});

test('run: refuses an argument with a newline on Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: true, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a\nb'], '/p', 1000, deps);
  // Assert
  assert.ok(result.error);
  assert.equal(calls.length, 0);
});

test('run: allows the same characters off Windows', () => {
  // Arrange
  const calls = [];
  const deps = { win: false, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  const result = run('tool', ['a%b', 'c"d'], '/p', 1000, deps);
  // Assert
  assert.equal(result.status, 0);
  assert.equal(calls.length, 1);
});

test('run: defaults the timeout to 60 seconds', () => {
  // Arrange
  const calls = [];
  const deps = { win: false, env: {}, spawn: (...a) => (calls.push(a), { status: 0 }) };
  // Act
  run('x', [], '/p', undefined, deps);
  // Assert
  assert.equal(calls[0][2].timeout, 60_000);
});

test('run: returns the spawn error result unchanged', () => {
  // Arrange
  const failure = { error: new Error('ENOENT'), status: null };
  const deps = { win: false, env: {}, spawn: () => failure };
  // Act
  const result = run('missing', [], '/p', 1000, deps);
  // Assert
  assert.equal(result, failure);
});

test('available: an npx step is available when installed in the project', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier' };
  const deps = { win: false, isFile: (f) => f === path.join('/p', 'node_modules', '.bin', 'prettier') };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: an npx step is available when a config file exists', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', configs: ['.prettierrc'] };
  const deps = { win: false, isFile: (f) => f === path.join('/p', '.prettierrc') };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: an npx step is available when package.json has its key', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', pkgKey: 'prettier' };
  const deps = { win: false, isFile: () => false, readFile: () => '{"prettier":{"semi":false}}' };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: an npx step is unavailable when neither installed nor configured', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', configs: ['.prettierrc'], pkgKey: 'prettier' };
  const deps = { win: false, isFile: () => false, readFile: () => '{"name":"x"}' };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('available: an npx step is unavailable when package.json is missing or invalid', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', pkgKey: 'prettier' };
  const deps = {
    win: false,
    isFile: () => false,
    readFile: () => {
      throw fsError('ENOENT');
    }
  };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('available: an npx step is unavailable when package.json is not JSON', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', pkgKey: 'prettier' };
  const deps = { win: false, isFile: () => false, readFile: () => '{nope' };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('available: rethrows an unexpected package.json read error', () => {
  // Arrange
  const step = { npx: true, cmd: 'prettier', pkgKey: 'prettier' };
  const deps = {
    win: false,
    isFile: () => false,
    readFile: () => {
      throw fsError('EIO');
    }
  };
  // Act
  const act = () => available(step, '/p', deps);
  // Assert
  assert.throws(act, { code: 'EIO' });
});

test('available: a requireConfig step is unavailable when installed but unconfigured', () => {
  // Arrange
  const step = { npx: true, cmd: 'eslint', configs: ['eslint.config.js'], requireConfig: true };
  const deps = { win: false, isFile: (f) => f.includes('node_modules') };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('installed: finds the project-local bin', () => {
  // Arrange
  const deps = { win: false, isFile: (f) => f === path.join('/p', 'node_modules', '.bin', 'prettier') };
  // Act
  const result = installed('prettier', '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('installed: is false without a project-local bin', () => {
  // Arrange
  const deps = { win: false, isFile: () => false };
  // Act
  const result = installed('prettier', '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('installed: tries PATHEXT suffixes on Windows', () => {
  // Arrange
  const deps = {
    win: true,
    env: { PATHEXT: '.EXE;.CMD' },
    isFile: (f) => f === path.join('/p', 'node_modules', '.bin', 'prettier.CMD')
  };
  // Act
  const result = installed('prettier', '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: finds a native tool on PATH', () => {
  // Arrange
  const step = { cmd: 'yamlfmt' };
  const deps = {
    win: false,
    env: { PATH: ['/bin', '/usr/bin'].join(path.delimiter) },
    isFile: (f) => f === path.join('/usr/bin', 'yamlfmt')
  };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: is false when the tool is not on PATH', () => {
  // Arrange
  const step = { cmd: 'yamlfmt' };
  const deps = { win: false, env: { PATH: '/bin' }, isFile: () => false };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('available: is false when no config file of the step exists', () => {
  // Arrange
  const step = { npx: true, cmd: 'eslint', configs: ['eslint.config.js'] };
  // Act
  const result = available(step, '/p', { isFile: () => false });
  // Assert
  assert.equal(result, false);
});

test('available: is true when a config file exists', () => {
  // Arrange
  const step = { npx: true, cmd: 'eslint', configs: ['eslint.config.js', 'eslint.config.mjs'] };
  const deps = { isFile: (f) => f === path.join('/p', 'eslint.config.mjs') };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: is false when the probe command fails', () => {
  // Arrange
  const step = { cmd: 'dotnet', probe: ['csharpier', '--version'] };
  const deps = { win: false, env: { PATH: '/bin' }, isFile: () => true, run: () => ({ status: 1 }) };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
});

test('available: is true when the probe command succeeds', () => {
  // Arrange
  const step = { cmd: 'dotnet', probe: ['csharpier', '--version'] };
  const deps = { win: false, env: { PATH: '/bin' }, isFile: () => true, run: () => ({ status: 0 }) };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('available: resolves a relative command against the project directory', () => {
  // Arrange
  const step = { cmd: 'vendor/bin/pint' };
  const deps = { win: false, env: { PATH: '' }, isFile: (f) => f === path.join('/p', 'vendor/bin/pint') };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, true);
});

test('resolveStep: returns a plain entry when it is available', () => {
  // Arrange
  const entry = { cmd: 'a', args: [] };
  // Act
  const step = resolveStep(entry, '/p', { available: () => true });
  // Assert
  assert.equal(step, entry);
});

test('resolveStep: returns the first available alt candidate', () => {
  // Arrange
  const entry = { alt: [{ cmd: 'a' }, { cmd: 'b' }, { cmd: 'c' }] };
  // Act
  const step = resolveStep(entry, '/p', { available: (s) => s.cmd !== 'a' });
  // Assert
  assert.equal(step.cmd, 'b');
});

test('resolveStep: is null when a plain entry is unavailable', () => {
  // Arrange
  const entry = { cmd: 'a', args: [] };
  // Act
  const step = resolveStep(entry, '/p', { available: () => false });
  // Assert
  assert.equal(step, null);
});

test('resolveStep: is null when no alt candidate is available', () => {
  // Arrange
  const entry = { alt: [{ cmd: 'a' }, { cmd: 'b' }] };
  // Act
  const step = resolveStep(entry, '/p', { available: () => false });
  // Assert
  assert.equal(step, null);
});

test('stepCommand: appends the targets to the args', () => {
  // Arrange
  const step = { cmd: 'prettier', args: ['-w'] };
  // Act
  const result = stepCommand(step, ['a.md', 'b.md']);
  // Assert
  assert.deepEqual(result, ['prettier', ['-w', 'a.md', 'b.md']]);
});

test('stepCommand: substitutes {file} with the first target and wraps npx steps', () => {
  // Arrange
  const step = { cmd: 'tool', args: ['--in', '{file}'], npx: true };
  // Act
  const result = stepCommand(step, ['a.md']);
  // Assert
  assert.deepEqual(result, ['npx', ['--no-install', 'tool', '--in', 'a.md']]);
});

test('stepCommand: puts extra args after the step args', () => {
  // Arrange
  const step = { cmd: 'eslint', args: ['--fix'] };
  // Act
  const result = stepCommand(step, ['a.js'], ['--max-warnings', '0']);
  // Assert
  assert.deepEqual(result, ['eslint', ['--fix', '--max-warnings', '0', 'a.js']]);
});

test('stepCommand: does not wrap a non-npx step', () => {
  // Arrange
  const step = { cmd: 'shfmt', args: [] };
  // Act
  const [cmd] = stepCommand(step, ['a.sh']);
  // Assert
  assert.equal(cmd, 'shfmt');
});

test('writeStdout: writes a temp file, then renames it over the target', () => {
  // Arrange
  const calls = [];
  const d = {
    pid: 9,
    writeFile: (...a) => calls.push(['write', ...a]),
    rename: (...a) => calls.push(['rename', ...a])
  };
  // Act
  writeStdout('/p/a.md', 'text', d);
  // Assert
  assert.deepEqual(calls, [
    ['write', '/p/a.md.9.tmp', 'text'],
    ['rename', '/p/a.md.9.tmp', '/p/a.md']
  ]);
});

test('writeStdout: does not rename when the write throws', () => {
  // Arrange
  const calls = [];
  const d = {
    pid: 9,
    writeFile: () => {
      throw new Error('disk full');
    },
    rename: () => calls.push('rename')
  };
  // Act
  const act = () => writeStdout('/p/a.md', 'text', d);
  // Assert
  assert.throws(act, /disk full/);
  assert.equal(calls.length, 0);
});

test('failureText: shows the command line and its stdout and stderr', () => {
  // Arrange
  const r = { stdout: 'out', stderr: 'err' };
  // Act
  const text = failureText('npx', ['--no-install', 'eslint', 'a.js'], r, {});
  // Assert
  assert.equal(text, '$ npx --no-install eslint a.js\nout\nerr');
});

test('failureText: includes the spawn error message', () => {
  // Arrange
  const r = { stdout: '', stderr: '', error: new Error('ENOENT') };
  // Act
  const text = failureText('x', [], r, {});
  // Assert
  assert.equal(text, '$ x\nENOENT');
});

test('failureText: drops stdout for a stdout-writing step', () => {
  // Arrange
  const r = { stdout: 'formatted file', stderr: 'bad' };
  // Act
  const text = failureText('fmt', ['a'], r, { stdout: true });
  // Assert
  assert.equal(text, '$ fmt a\nbad');
});
