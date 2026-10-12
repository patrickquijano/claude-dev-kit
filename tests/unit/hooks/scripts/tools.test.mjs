import assert from 'node:assert/strict';
import path from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { available, installed, isFile, keyOf, readStdin, run } from '../../../../hooks/scripts/tools.mjs';

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

test('isFile: is false when stat throws', () => {
  // Arrange
  const deps = {
    statSync: () => {
      throw new Error('ENOENT');
    }
  };
  // Act
  const result = isFile('missing', deps);
  // Assert
  assert.equal(result, false);
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
      throw new Error('ENOENT');
    }
  };
  // Act
  const result = available(step, '/p', deps);
  // Assert
  assert.equal(result, false);
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

test('readStdin: concatenates all chunks', async () => {
  // Arrange
  const stream = Readable.from(['{"a":', '1}']);
  // Act
  const data = await readStdin(stream);
  // Assert
  assert.equal(data, '{"a":1}');
});

test('readStdin: returns an empty string for an empty stream', async () => {
  // Arrange
  const stream = Readable.from([]);
  // Act
  const data = await readStdin(stream);
  // Assert
  assert.equal(data, '');
});
