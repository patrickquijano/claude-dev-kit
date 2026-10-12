import assert from 'node:assert/strict';
import { test } from 'node:test';
import { graphifyStop, message } from '../../../../hooks/scripts/graphify-stop.mjs';

// Deps for a configured project; `session`/`project` are the stored states, `writes` records saves by file.
function make({
  configured = true,
  present = true,
  session = {},
  project = {},
  snap = { head: 'h', fp: 'f' },
  run = { status: 0 },
  cwdFails = false
} = {}) {
  const writes = {};
  const runs = [];
  const deps = {
    env: { CLAUDE_PROJECT_DIR: '/repo' },
    cwd: () => '/cwd',
    realpathSync: (p) => {
      if (cwdFails) throw new Error('ENOENT');
      return p;
    },
    graphifyConfigured: () => configured,
    graphifyFilesExist: () => present,
    statePath: (name, cwd, sid) => (sid ? 'session.json' : 'project.json'),
    readState: (f) => structuredClone(f === 'session.json' ? session : project),
    writeState: (f, s) => (writes[f] = s),
    treeSnapshot: () => snap,
    runGraphify: (...args) => (runs.push(args), run)
  };
  return { deps, writes, runs };
}

test('message returns a plain system message', () => {
  // Arrange
  const text = 'x';
  // Act
  const result = message(text);
  // Assert
  assert.deepEqual(result, { systemMessage: 'x' });
});

test('message blocks when given a reason', () => {
  // Arrange
  const text = 'x';
  // Act
  const result = message(text, 'r');
  // Assert
  assert.deepEqual(result, { systemMessage: 'x', decision: 'block', reason: 'r' });
});

test('graphifyStop updates the graph when the tree changed', () => {
  // Arrange
  const { deps, runs, writes } = make({ project: { lastKey: 'old' } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.match(result.systemMessage, /Graphify knowledge updated/);
  assert.deepEqual(runs[0][0], ['update', '.']);
  assert.equal(writes['project.json'].lastKey, 'h:f');
});

test('graphifyStop asks once to initialize a missing graph', () => {
  // Arrange
  const { deps, writes } = make({ present: false });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.equal(writes['session.json'].init, 'pending');
});

test('graphifyStop reports a successful initialization', () => {
  // Arrange
  const { deps, writes } = make({ session: { init: 'pending' }, project: { initFailed: true } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result.systemMessage, '✅ Graphify knowledge initialized');
  assert.equal(writes['project.json'].initFailed, undefined);
});

test('graphifyStop reports a failed initialization and remembers it', () => {
  // Arrange
  const { deps, writes } = make({ present: false, session: { init: 'pending' } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result.systemMessage, '❌ Graphify knowledge initialize error');
  assert.equal(writes['project.json'].initFailed, true);
});

test('graphifyStop reports a failed update', () => {
  // Arrange
  const { deps } = make({ run: { status: 1 } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.match(result.systemMessage, /update error/);
});

test('graphifyStop stays silent when Graphify is not configured', () => {
  // Arrange
  const { deps, runs } = make({ configured: false });
  // Act
  const result = graphifyStop({}, deps);
  // Assert
  assert.equal(result, null);
  assert.equal(runs.length, 0);
});

test('graphifyStop stays silent when the project directory cannot be resolved', () => {
  // Arrange
  const { deps } = make({ cwdFails: true });
  // Act
  const result = graphifyStop({}, deps);
  // Assert
  assert.equal(result, null);
});

test('graphifyStop does not rerun on an unchanged tree', () => {
  // Arrange
  const { deps, runs } = make({ project: { lastKey: 'h:f' } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result, null);
  assert.equal(runs.length, 0);
});

test('graphifyStop does not update while a Stop hook is continuing', () => {
  // Arrange
  const { deps, runs } = make();
  // Act
  const result = graphifyStop({ stop_hook_active: true }, deps);
  // Assert
  assert.equal(result, null);
  assert.equal(runs.length, 0);
});

test('graphifyStop never asks to initialize again after a failure', () => {
  // Arrange
  const { deps } = make({ present: false, project: { initFailed: true } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result, null);
});

test('graphifyStop does not ask twice in one session', () => {
  // Arrange
  const { deps } = make({ present: false, session: { init: 'done' } });
  // Act
  const result = graphifyStop({ session_id: 's' }, deps);
  // Assert
  assert.equal(result, null);
});
