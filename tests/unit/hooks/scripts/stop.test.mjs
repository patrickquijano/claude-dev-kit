import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runStep, STEPS, stop } from '../../../../hooks/scripts/stop.mjs';

const step = { name: 'x', script: 'x.mjs', timeout: 7 };
const ok = (obj) => ({ status: 0, stdout: Buffer.from(JSON.stringify(obj)) });
// Deps whose runner answers per script name; `writes` records saved state.
function make({ results = {}, state = {} } = {}) {
  const writes = [];
  const calls = [];
  const deps = {
    execPath: 'node',
    env: { CLAUDE_PROJECT_DIR: '/repo' },
    cwd: () => '/cwd',
    realpathSync: (p) => p,
    scriptPath: (s) => `/scripts/${s}`,
    statePath: () => '/state.json',
    readState: () => structuredClone(state),
    writeState: (f, s) => writes.push(s),
    proc: (cmd, args, opts) => {
      calls.push({ args, opts });
      const name = args[0].split('/').pop();
      return results[name] ?? { status: 0, stdout: Buffer.from('') };
    }
  };
  return { deps, writes, calls };
}

test('STEPS runs format-lint, graphify, then commit last', () => {
  // Arrange
  const names = STEPS.map((s) => s.name);
  // Act
  const result = names.join(',');
  // Assert
  assert.equal(result, 'format-lint,graphify,commit');
});

test('runStep returns the JSON object a step printed', () => {
  // Arrange
  const { deps } = make({ results: { 'x.mjs': ok({ systemMessage: 'a' }) } });
  // Act
  const result = runStep(step, {}, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: 'a' });
});

test('runStep passes the input on stdin with the step timeout and no shell', () => {
  // Arrange
  const { deps, calls } = make({ results: { 'x.mjs': ok({}) } });
  // Act
  runStep(step, { a: 1 }, deps);
  // Assert
  assert.equal(calls[0].opts.input, '{"a":1}');
  assert.equal(calls[0].opts.timeout, 7);
  assert.equal(calls[0].opts.shell, undefined);
});

test('runStep returns null on a non-zero exit', () => {
  // Arrange
  const { deps } = make({ results: { 'x.mjs': { status: 1, stdout: Buffer.from('{}') } } });
  // Act
  const result = runStep(step, {}, deps);
  // Assert
  assert.equal(result, null);
});

test('runStep returns null when the process could not start', () => {
  // Arrange
  const { deps } = make({ results: { 'x.mjs': { error: new Error('ENOENT'), status: null } } });
  // Act
  const result = runStep(step, {}, deps);
  // Assert
  assert.equal(result, null);
});

test('runStep returns null for non-JSON output', () => {
  // Arrange
  const { deps } = make({ results: { 'x.mjs': { status: 0, stdout: Buffer.from('oops') } } });
  // Act
  const result = runStep(step, {}, deps);
  // Assert
  assert.equal(result, null);
});

test('runStep returns null for JSON that is not an object', () => {
  // Arrange
  const { deps } = make({ results: { 'x.mjs': { status: 0, stdout: Buffer.from('3') } } });
  // Act
  const result = runStep(step, {}, deps);
  // Assert
  assert.equal(result, null);
});

test('stop joins the messages of every step', () => {
  // Arrange
  const { deps } = make({
    results: {
      'format-lint-repo.mjs': ok({ systemMessage: 'A' }),
      'graphify-stop.mjs': ok({ systemMessage: 'B' }),
      'commit-stop.mjs': ok({ systemMessage: 'C' })
    }
  });
  // Act
  const result = stop({ session_id: 's' }, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: 'A | B | C' });
});

test('stop halts at the first block so commit never runs', () => {
  // Arrange
  const { deps, calls } = make({
    results: { 'graphify-stop.mjs': ok({ systemMessage: 'G', decision: 'block', reason: 'r' }) }
  });
  // Act
  const result = stop({ session_id: 's' }, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: 'G', decision: 'block', reason: 'r' });
  assert.equal(calls.length, 2);
});

test('stop records which step blocked', () => {
  // Arrange
  const { deps, writes } = make({
    results: { 'commit-stop.mjs': ok({ systemMessage: 'C', decision: 'block', reason: 'r' }) }
  });
  // Act
  stop({}, deps);
  // Assert
  assert.equal(writes[0].blocker, 'commit');
});

test('stop forwards stop_hook_active only to the step that blocked before', () => {
  // Arrange
  const { deps, calls } = make({ state: { blocker: 'graphify' } });
  // Act
  stop({ stop_hook_active: true }, deps);
  // Assert
  const flags = calls.map((c) => JSON.parse(c.opts.input).stop_hook_active);
  assert.deepEqual(flags, [false, true, false]);
});

test('stop prints nothing when every step is silent', () => {
  // Arrange
  const { deps, writes } = make({ state: { blocker: '' } });
  // Act
  const result = stop({}, deps);
  // Assert
  assert.equal(result, null);
  assert.equal(writes.length, 0);
});

test('stop skips a step that failed and still reports the others', () => {
  // Arrange
  const { deps } = make({
    results: {
      'format-lint-repo.mjs': { status: 1, stdout: Buffer.from('') },
      'commit-stop.mjs': ok({ systemMessage: 'C' })
    }
  });
  // Act
  const result = stop({}, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: 'C' });
});

test('stop still runs when the project directory cannot be resolved', () => {
  // Arrange
  const { deps } = make({ results: { 'commit-stop.mjs': ok({ systemMessage: 'C' }) } });
  deps.realpathSync = () => {
    throw new Error('ENOENT');
  };
  // Act
  const result = stop({}, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: 'C' });
});
