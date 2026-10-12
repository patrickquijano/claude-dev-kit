import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commitStop, message } from '../../../../hooks/scripts/commit-stop.mjs';

const clean = { dirty: false, head: 'h1', fp: '', status: '' };
const dirty = { dirty: true, head: 'h1', fp: 'fp1', status: ' M a\0' };
// Deps for a normal repo; `state` is the stored hook state and `writes` records saves.
function make({ snap = dirty, state = {}, marker = false, unsafe = false, isPushed = true, cwdFails = false } = {}) {
  const writes = [];
  const deps = {
    env: { CLAUDE_PROJECT_DIR: '/repo' },
    cwd: () => '/cwd',
    realpathSync: (p) => {
      if (cwdFails) throw new Error('ENOENT');
      return p;
    },
    treeSnapshot: () => snap,
    git: () => ({ status: 0, stdout: Buffer.from('.git/cdk-ship-release\n') }),
    existsSync: () => marker,
    statePath: () => '/state.json',
    readState: () => structuredClone(state),
    writeState: (file, s) => writes.push(s),
    unsafeState: () => unsafe,
    pushed: () => isPushed
  };
  return { deps, writes };
}

test('message returns only a system message without a reason', () => {
  // Arrange
  const text = 'hi';
  // Act
  const result = message(text);
  // Assert
  assert.deepEqual(result, { systemMessage: 'hi' });
});

test('message adds a block decision with a reason', () => {
  // Arrange
  const text = 'hi';
  // Act
  const result = message(text, 'why');
  // Assert
  assert.deepEqual(result, { systemMessage: 'hi', decision: 'block', reason: 'why' });
});

test('message with an empty reason does not block', () => {
  // Arrange
  const text = 'hi';
  // Act
  const result = message(text, '');
  // Assert
  assert.equal(result.decision, undefined);
});

test('commitStop blocks a dirty tree and asks for cdk:commit-changes', () => {
  // Arrange
  const { deps } = make();
  // Act
  const result = commitStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /cdk:commit-changes/);
});

test('commitStop records the pending commit and the instructed fingerprint', () => {
  // Arrange
  const { deps, writes } = make();
  // Act
  commitStop({ session_id: 's' }, deps);
  // Assert
  assert.deepEqual(writes[0].pending, { fp: 'fp1', head: 'h1' });
  assert.deepEqual(writes[0].instructed, ['fp1']);
});

test('commitStop reports a committed and pushed result', () => {
  // Arrange
  const { deps } = make({ snap: { ...clean, head: 'h2' }, state: { pending: { fp: 'fp1', head: 'h1' } } });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result.systemMessage, '✅ Git changes committed');
});

test('commitStop reports a clean tree', () => {
  // Arrange
  const { deps } = make({ snap: clean });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result.systemMessage, '⏺ No Git changes to commit');
});

test('commitStop holds while the ship-release marker exists', () => {
  // Arrange
  const { deps } = make({ marker: true });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result.systemMessage, '⏸ ship-release pending: not committing');
  assert.equal(result.decision, undefined);
});

test('commitStop reports an error when the pending commit did not land', () => {
  // Arrange
  const { deps, writes } = make({ state: { pending: { fp: 'fp1', head: 'h1' } } });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result.systemMessage, '❌ Git changes error');
  assert.deepEqual(writes[0].instructed, ['fp1']);
});

test('commitStop reports an error when the commit is not pushed', () => {
  // Arrange
  const { deps } = make({
    snap: { ...clean, head: 'h2' },
    state: { pending: { fp: 'f', head: 'h1' } },
    isPushed: false
  });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result.systemMessage, '❌ Git changes error');
});

test('commitStop does nothing when the project directory cannot be resolved', () => {
  // Arrange
  const { deps } = make({ cwdFails: true });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result, null);
});

test('commitStop does nothing when git cannot snapshot the tree', () => {
  // Arrange
  const { deps } = make({ snap: null });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result, null);
});

test('commitStop stays silent while a Stop hook is already continuing', () => {
  // Arrange
  const { deps } = make();
  // Act
  const result = commitStop({ stop_hook_active: true }, deps);
  // Assert
  assert.equal(result, null);
});

test('commitStop does not instruct the same fingerprint twice', () => {
  // Arrange
  const { deps } = make({ state: { instructed: ['fp1'] } });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result, null);
});

test('commitStop leaves pre-session work alone', () => {
  // Arrange
  const { deps } = make({ state: { baseline: 'fp1' } });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result, null);
});

test('commitStop skips an unsafe git state', () => {
  // Arrange
  const { deps, writes } = make({ unsafe: true });
  // Act
  const result = commitStop({}, deps);
  // Assert
  assert.equal(result, null);
  assert.equal(writes.length, 0);
});
