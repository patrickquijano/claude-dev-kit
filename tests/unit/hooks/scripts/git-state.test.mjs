import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { git, readState, sha, statePath, unsafeState, writeState } from '../../../../hooks/scripts/git-state.mjs';

const out = (text, status = 0) => ({ status, stdout: Buffer.from(text) });
const fail = { status: 1, stdout: Buffer.from('') };
// Git stub keyed by the first arguments of the call; unknown calls fail.
const procBy = (table) => (cmd, args) => {
  const key = Object.keys(table).find((k) => args.join(' ').startsWith(k));
  const hit = key === undefined ? fail : table[key];
  return typeof hit === 'function' ? hit(args) : hit;
};
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

test('unsafeState is true on a detached HEAD', () => {
  // Arrange
  const deps = { proc: procBy({ 'symbolic-ref': fail }), existsSync: () => false };
  // Act
  const result = unsafeState('/r', '', deps);
  // Assert
  assert.equal(result, true);
});

test('unsafeState is true when a merge marker exists', () => {
  // Arrange
  const deps = {
    proc: procBy({ 'symbolic-ref': out('refs/heads/main'), 'rev-parse': (a) => out(`.git/${a[2]}\n`) }),
    existsSync: (p) => p.endsWith('MERGE_HEAD')
  };
  // Act
  const result = unsafeState('/r', '', deps);
  // Assert
  assert.equal(result, true);
});

test('unsafeState is true with an unmerged path in the status', () => {
  // Arrange
  const deps = {
    proc: procBy({ 'symbolic-ref': out('refs/heads/main'), 'rev-parse': fail }),
    existsSync: () => false
  };
  // Act
  const result = unsafeState('/r', 'UU conflict.txt\0', deps);
  // Assert
  assert.equal(result, true);
});

test('unsafeState is false on a normal branch with a plain change', () => {
  // Arrange
  const deps = {
    proc: procBy({ 'symbolic-ref': out('refs/heads/main'), 'rev-parse': (a) => out(`.git/${a[2]}\n`) }),
    existsSync: () => false
  };
  // Act
  const result = unsafeState('/r', ' M a.txt\0', deps);
  // Assert
  assert.equal(result, false);
});

test('unsafeState is false when git markers cannot be resolved', () => {
  // Arrange
  const deps = {
    proc: procBy({ 'symbolic-ref': out('refs/heads/main'), 'rev-parse': fail }),
    existsSync: () => true
  };
  // Act
  const result = unsafeState('/r', '', deps);
  // Assert
  assert.equal(result, false);
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

test('readState returns the stored object', () => {
  // Arrange
  const deps = { readFileSync: () => '{"a":1}' };
  // Act
  const result = readState('f', deps);
  // Assert
  assert.deepEqual(result, { a: 1 });
});

test('readState returns an empty object for a missing file', () => {
  // Arrange
  const deps = {
    readFileSync: () => {
      throw new Error('ENOENT');
    }
  };
  // Act
  const result = readState('f', deps);
  // Assert
  assert.deepEqual(result, {});
});

test('readState returns an empty object for invalid JSON', () => {
  // Arrange
  const deps = { readFileSync: () => '{nope' };
  // Act
  const result = readState('f', deps);
  // Assert
  assert.deepEqual(result, {});
});

test('readState returns an empty object for a non-object value', () => {
  // Arrange
  const deps = { readFileSync: () => '5' };
  // Act
  const result = readState('f', deps);
  // Assert
  assert.deepEqual(result, {});
});

test('writeState writes the state as JSON', () => {
  // Arrange
  const writes = [];
  const deps = { writeFileSync: (f, d) => writes.push([f, d]) };
  // Act
  writeState('f', { a: 1 }, deps);
  // Assert
  assert.deepEqual(writes, [['f', '{"a":1}']]);
});

test('writeState writes an empty object', () => {
  // Arrange
  const writes = [];
  const deps = { writeFileSync: (f, d) => writes.push(d) };
  // Act
  writeState('f', {}, deps);
  // Assert
  assert.deepEqual(writes, ['{}']);
});

test('writeState swallows an unwritable temp dir', () => {
  // Arrange
  const deps = {
    writeFileSync: () => {
      throw new Error('EACCES');
    }
  };
  // Act
  const result = writeState('f', { a: 1 }, deps);
  // Assert
  assert.equal(result, undefined);
});

test('writeState swallows a state that cannot be stringified', () => {
  // Arrange
  const deps = { writeFileSync: () => {} };
  const cyclic = {};
  cyclic.self = cyclic;
  // Act
  const result = writeState('f', cyclic, deps);
  // Assert
  assert.equal(result, undefined);
});
