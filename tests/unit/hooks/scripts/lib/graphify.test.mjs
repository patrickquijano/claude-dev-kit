import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import {
  graphifyConfigured,
  graphifyFilesExist,
  OUT_FILES,
  runGraphify,
  which
} from '../../../../../hooks/scripts/lib/graphify.mjs';

const BIN = path.join('/bin', 'graphify');
// Deps where `graphify` is an executable file at /bin/graphify and `existing` paths exist.
const make = ({ existing = [], claudeMd, platform = 'linux', proc, env = {} } = {}) => ({
  platform,
  env: { PATH: '/bin', ...env },
  statSync: (p) => {
    if (p !== BIN && p !== `${BIN}.CMD`) throw new Error('ENOENT');
    return { isFile: () => true, mode: 0o755 };
  },
  existsSync: (p) => existing.includes(p),
  readFileSync: () => {
    if (claudeMd === undefined) throw new Error('ENOENT');
    return claudeMd;
  },
  proc
});

test('which finds an executable on PATH', () => {
  // Arrange
  const deps = make();
  // Act
  const result = which('graphify', deps);
  // Assert
  assert.equal(result, BIN);
});

test('which honors PATHEXT on Windows', () => {
  // Arrange
  const deps = make({ platform: 'win32', env: { PATHEXT: '.CMD' } });
  // Act
  const result = which('graphify', deps);
  // Assert
  assert.equal(result, `${BIN}.CMD`);
});

test('which returns null when the command is not on PATH', () => {
  // Arrange
  const deps = make();
  // Act
  const result = which('missing', deps);
  // Assert
  assert.equal(result, null);
});

test('which skips a non-executable file on POSIX', () => {
  // Arrange
  const deps = { ...make(), statSync: () => ({ isFile: () => true, mode: 0o644 }) };
  // Act
  const result = which('graphify', deps);
  // Assert
  assert.equal(result, null);
});

test('graphifyConfigured is true with the rules file', () => {
  // Arrange
  const deps = make({ existing: [path.join('/p', '.claude', 'rules', 'graphify.md')] });
  // Act
  const result = graphifyConfigured('/p', deps);
  // Assert
  assert.equal(result, true);
});

test('graphifyConfigured is true with a graphify heading in CLAUDE.md', () => {
  // Arrange
  const deps = make({ claudeMd: '# x\n\n## graphify\n' });
  // Act
  const result = graphifyConfigured('/p', deps);
  // Assert
  assert.equal(result, true);
});

test('graphifyConfigured is false when graphify is not installed', () => {
  // Arrange
  const deps = {
    ...make({ existing: [path.join('/p', '.claude', 'rules', 'graphify.md')] }),
    env: { PATH: '/nowhere' }
  };
  // Act
  const result = graphifyConfigured('/p', deps);
  // Assert
  assert.equal(result, false);
});

test('graphifyConfigured is false with neither rules file nor heading', () => {
  // Arrange
  const deps = make({ claudeMd: '# x\n\n## other\n' });
  // Act
  const result = graphifyConfigured('/p', deps);
  // Assert
  assert.equal(result, false);
});

test('graphifyConfigured is false when CLAUDE.md is unreadable', () => {
  // Arrange
  const deps = make();
  // Act
  const result = graphifyConfigured('/p', deps);
  // Assert
  assert.equal(result, false);
});

test('graphifyFilesExist is true when all output files exist', () => {
  // Arrange
  const deps = { existsSync: () => true };
  // Act
  const result = graphifyFilesExist('/p', deps);
  // Assert
  assert.equal(result, true);
});

test('graphifyFilesExist checks every output file under graphify-out', () => {
  // Arrange
  const seen = [];
  const deps = { existsSync: (p) => (seen.push(p), true) };
  // Act
  graphifyFilesExist('/p', deps);
  // Assert
  assert.deepEqual(
    seen,
    OUT_FILES.map((f) => path.join('/p', 'graphify-out', f))
  );
});

test('graphifyFilesExist is false when one output file is missing', () => {
  // Arrange
  const deps = { existsSync: (p) => !p.endsWith('graph.json') };
  // Act
  const result = graphifyFilesExist('/p', deps);
  // Assert
  assert.equal(result, false);
});

test('graphifyFilesExist is false when none exist', () => {
  // Arrange
  const deps = { existsSync: () => false };
  // Act
  const result = graphifyFilesExist('/p', deps);
  // Assert
  assert.equal(result, false);
});

test('runGraphify starts the binary with an argument array and no shell', () => {
  // Arrange
  const calls = [];
  const deps = make({ proc: (cmd, args, opts) => (calls.push({ cmd, args, opts }), { status: 0 }) });
  // Act
  runGraphify(['update', '.'], '/p', 5, deps);
  // Assert
  assert.equal(calls[0].cmd, BIN);
  assert.deepEqual(calls[0].args, ['update', '.']);
  assert.equal(calls[0].opts.timeout, 5);
  assert.equal(calls[0].opts.shell, undefined);
});

test('runGraphify routes a Windows cmd shim through cmd.exe', () => {
  // Arrange
  const calls = [];
  const deps = make({
    platform: 'win32',
    env: { PATHEXT: '.CMD', ComSpec: 'C:\\cmd.exe' },
    proc: (cmd, args) => (calls.push({ cmd, args }), { status: 0 })
  });
  // Act
  runGraphify(['update'], '/p', 5, deps);
  // Assert
  assert.equal(calls[0].cmd, 'C:\\cmd.exe');
  assert.deepEqual(calls[0].args, ['/d', '/s', '/c', `${BIN}.CMD`, 'update']);
});

test('runGraphify reports a missing binary without starting it', () => {
  // Arrange
  let started = false;
  const deps = { ...make({ proc: () => (started = true) }), env: { PATH: '/nowhere' } };
  // Act
  const result = runGraphify(['update'], '/p', 5, deps);
  // Assert
  assert.equal(result.status, null);
  assert.match(result.error.message, /not found/);
  assert.equal(started, false);
});

test('runGraphify returns the process result including a failure status', () => {
  // Arrange
  const deps = make({ proc: () => ({ status: 2 }) });
  // Act
  const result = runGraphify(['update'], '/p', 5, deps);
  // Assert
  assert.equal(result.status, 2);
});
