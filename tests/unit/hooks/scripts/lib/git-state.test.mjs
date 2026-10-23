import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { git, sha, statePath } from '../../../../../hooks/scripts/lib/git-state.mjs';

const out = (text, status = 0) => ({ status, stdout: Buffer.from(text) });
test('sha returns 16 hex characters', () => {
  // Arrange
  const input = 'hello';
  // Act
  const result = sha(input);
  // Assert
  assert.match(result, /^[0-9a-f]{16}$/);
});

test('sha is stable for the same input', () => {
  // Arrange
  const a = 'same';
  // Act
  const result = sha(a) === sha('same');
  // Assert
  assert.equal(result, true);
});

test('sha differs for different inputs', () => {
  // Arrange
  const a = 'one';
  // Act
  const result = sha(a) === sha('two');
  // Assert
  assert.equal(result, false);
});

test('sha coerces a non-string input instead of throwing', () => {
  // Arrange
  const input = undefined;
  // Act
  const result = sha(input);
  // Assert
  assert.equal(result, sha('undefined'));
});

test('git runs git with the cwd, arguments, and default timeout', () => {
  // Arrange
  const calls = [];
  const deps = { proc: (cmd, args, opts) => (calls.push({ cmd, args, opts }), out('')) };
  // Act
  git('/repo', ['status'], undefined, deps);
  // Assert
  assert.equal(calls[0].cmd, 'git');
  assert.deepEqual(calls[0].args, ['status']);
  assert.equal(calls[0].opts.cwd, '/repo');
  assert.equal(calls[0].opts.timeout, 15_000);
});

test('git honors an explicit timeout', () => {
  // Arrange
  const calls = [];
  const deps = { proc: (cmd, args, opts) => (calls.push(opts), out('')) };
  // Act
  git('/repo', ['log'], 99, deps);
  // Assert
  assert.equal(calls[0].timeout, 99);
});

test('git returns the process error result unchanged', () => {
  // Arrange
  const boom = { error: new Error('ENOENT'), status: null };
  const deps = { proc: () => boom };
  // Act
  const result = git('/repo', ['status'], undefined, deps);
  // Assert
  assert.equal(result, boom);
});

test('git passes a failing exit status through', () => {
  // Arrange
  const deps = { proc: () => ({ status: 128, stdout: Buffer.from('') }) };
  // Act
  const result = git('/repo', ['status'], undefined, deps);
  // Assert
  assert.equal(result.status, 128);
});

test('statePath lives in the temp dir and names the hook', () => {
  // Arrange
  const deps = { tmpdir: () => '/tmp-x' };
  // Act
  const result = statePath('commit', '/r', 's', deps);
  // Assert
  assert.ok(result.startsWith(path.join('/tmp-x', 'cdk-commit-')));
  assert.ok(result.endsWith('.json'));
});

test('statePath is stable for the same project and session', () => {
  // Arrange
  const deps = { tmpdir: () => '/t' };
  // Act
  const result = statePath('a', '/r', 's', deps) === statePath('a', '/r', 's', deps);
  // Assert
  assert.equal(result, true);
});

test('statePath differs per session', () => {
  // Arrange
  const deps = { tmpdir: () => '/t' };
  // Act
  const result = statePath('a', '/r', 's1', deps) === statePath('a', '/r', 's2', deps);
  // Assert
  assert.equal(result, false);
});

test('statePath differs per project', () => {
  // Arrange
  const deps = { tmpdir: () => '/t' };
  // Act
  const result = statePath('a', '/r1', '', deps) === statePath('a', '/r2', '', deps);
  // Assert
  assert.equal(result, false);
});
