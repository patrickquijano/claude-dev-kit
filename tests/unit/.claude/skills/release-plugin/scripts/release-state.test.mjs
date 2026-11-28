import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  cleanValues,
  emptyState,
  inside,
  loadState,
  markStep,
  migrateLegacy,
  resumePoint,
  run,
  saveState,
  validateState
} from '../../../../../../.claude/skills/release-plugin/scripts/release-state.mjs';

const ROOT = '/repo';
const enoent = () => Object.assign(new Error('missing'), { code: 'ENOENT' });

// Stub deps over an in-memory file map; a missing path throws ENOENT.
const makeDeps = (files = {}) => {
  const log = { writes: {}, rm: [], mkdir: [], out: [] };
  return {
    log,
    deps: {
      readFile: (p) => {
        if (p in files) return files[p];
        throw enoent();
      },
      writeFile: (p, t) => (log.writes[p] = t),
      mkdir: (p) => log.mkdir.push(p),
      rm: (p) => log.rm.push(p),
      stdout: (t) => log.out.push(t)
    }
  };
};

describe('markStep and resumePoint', () => {
  test('marks a step done and resumes at the next', () => {
    // Arrange
    const state = emptyState();
    // Act
    const next = markStep(markStep(state, 1, 'done'), 2, 'done');
    // Assert
    assert.equal(resumePoint(next), 3);
  });

  test('merges outputs and does not mutate the input', () => {
    // Arrange
    const state = emptyState();
    // Act
    const next = markStep(state, 10, 'done', { outputs: { pr: 'https://x/pull/1' } });
    // Assert
    assert.equal(next.steps[10].outputs.pr, 'https://x/pull/1');
    assert.deepEqual(state.steps[10].outputs, {});
  });

  test('resume is the first failed step even when later steps are done', () => {
    // Arrange
    let state = markStep(emptyState(), 1, 'done');
    state = markStep(markStep(state, 2, 'failed'), 3, 'done');
    // Act
    const point = resumePoint(state);
    // Assert
    assert.equal(point, 2);
  });

  test('resume is null when all 17 steps are done', () => {
    // Arrange
    let state = emptyState();
    for (let n = 1; n <= 17; n++) state = markStep(state, n, 'done');
    // Act
    const point = resumePoint(state);
    // Assert
    assert.equal(point, null);
  });

  test('rejects a step outside 1-17 and an unknown status', () => {
    // Arrange
    const state = emptyState();
    // Act
    const bad = () => markStep(state, 18, 'done');
    // Assert
    assert.throws(bad, RangeError);
    assert.throws(() => markStep(state, 1, 'weird'), RangeError);
  });
});

describe('cleanValues', () => {
  test('keeps whitelisted single-line strings', () => {
    // Arrange
    const values = { version: '1.2.3', branch: 'feat/x' };
    // Act
    const out = cleanValues(values);
    // Assert
    assert.deepEqual(out, values);
  });

  test('rejects a key outside the whitelist', () => {
    // Arrange
    const values = { token: 'abc' };
    // Act
    const act = () => cleanValues(values);
    // Assert
    assert.throws(act, /key not allowed: token/);
  });

  test('rejects a multi-line or non-string value', () => {
    // Arrange
    const multi = { pr: 'a\nb' };
    // Act
    const act = () => cleanValues(multi);
    // Assert
    assert.throws(act, RangeError);
    assert.throws(() => cleanValues({ pr: 5 }), RangeError);
  });

  test('rejects a non-object', () => {
    // Arrange
    const values = ['x'];
    // Act
    const act = () => cleanValues(values);
    // Assert
    assert.throws(act, TypeError);
  });
});

describe('validateState and migrateLegacy', () => {
  test('accepts an empty state', () => {
    // Arrange
    const state = emptyState();
    // Act
    const out = validateState(state);
    // Assert
    assert.equal(out, state);
  });

  test('rejects a wrong schema and a missing step', () => {
    // Arrange
    const state = emptyState();
    delete state.steps[5];
    // Act
    const act = () => validateState(state);
    // Assert
    assert.throws(act, /step 5/);
    assert.throws(() => validateState({ schema: 2 }), TypeError);
  });

  test('migrates lastStep 6 to six done steps with the values', () => {
    // Arrange
    const legacy = { version: '0.10.1', branch: 'feat/a', pr: null, mergedSha: null, lastStep: 6 };
    // Act
    const state = migrateLegacy(legacy);
    // Assert
    assert.equal(resumePoint(state), 7);
    assert.equal(state.steps[6].outputs.version, '0.10.1');
    assert.equal(state.steps[6].outputs.pr, undefined);
  });

  test('migrates lastStep 0 to a fully pending state', () => {
    // Arrange
    const legacy = { version: '1.0.0', lastStep: 0 };
    // Act
    const state = migrateLegacy(legacy);
    // Assert
    assert.equal(resumePoint(state), 1);
  });

  test('rejects a legacy file with a bad lastStep', () => {
    // Arrange
    const legacy = { lastStep: 'x' };
    // Act
    const act = () => migrateLegacy(legacy);
    // Assert
    assert.throws(act, TypeError);
    assert.throws(() => migrateLegacy({ lastStep: 18 }), TypeError);
  });
});

describe('inside, loadState, saveState', () => {
  test('inside resolves a path under the root', () => {
    // Arrange
    const file = '.release/state.json';
    // Act
    const full = inside(ROOT, file);
    // Assert
    assert.equal(full, '/repo/.release/state.json');
  });

  test('inside rejects a relative root and an escaping path', () => {
    // Arrange
    const file = '../x';
    // Act
    const act = () => inside(ROOT, file);
    // Assert
    assert.throws(act, RangeError);
    assert.throws(() => inside('repo', 'a'), TypeError);
  });

  test('loadState reads the current file', () => {
    // Arrange
    const { deps } = makeDeps({ '/repo/.release/state.json': JSON.stringify(emptyState()) });
    // Act
    const { source } = loadState(ROOT, deps);
    // Assert
    assert.equal(source, 'state');
  });

  test('loadState migrates the legacy file when the new one is absent', () => {
    // Arrange
    const { deps } = makeDeps({ '/repo/.release-state.json': JSON.stringify({ lastStep: 3, version: '1.0.0' }) });
    // Act
    const { state, source } = loadState(ROOT, deps);
    // Assert
    assert.equal(source, 'legacy');
    assert.equal(resumePoint(state), 4);
  });

  test('loadState reports none when neither file exists', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const out = loadState(ROOT, deps);
    // Assert
    assert.deepEqual(out, { state: null, source: 'none' });
  });

  test('loadState rethrows invalid JSON', () => {
    // Arrange
    const { deps } = makeDeps({ '/repo/.release/state.json': 'nope' });
    // Act
    const act = () => loadState(ROOT, deps);
    // Assert
    assert.throws(act, SyntaxError);
  });

  test('saveState writes the new file and removes the legacy one', () => {
    // Arrange
    const { deps, log } = makeDeps();
    // Act
    saveState(ROOT, emptyState(), deps);
    // Assert
    assert.ok('/repo/.release/state.json' in log.writes);
    assert.deepEqual(log.rm, ['/repo/.release-state.json']);
  });

  test('saveState refuses an invalid state without writing', () => {
    // Arrange
    const { deps, log } = makeDeps();
    // Act
    const act = () => saveState(ROOT, { schema: 1 }, deps);
    // Assert
    assert.throws(act, TypeError);
    assert.deepEqual(log.writes, {});
  });
});

describe('run', () => {
  test('resume prints the first incomplete step', () => {
    // Arrange
    const state = markStep(emptyState(), 1, 'done');
    const { deps, log } = makeDeps({ '/repo/.release/state.json': JSON.stringify(state) });
    // Act
    const code = run([ROOT, 'resume'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(log.out[0]).resume, 2);
  });

  test('resume exits 1 with no state', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const code = run([ROOT, 'resume'], deps);
    // Assert
    assert.equal(code, 1);
  });

  test('mark writes the step with its outputs', () => {
    // Arrange
    const { deps, log } = makeDeps();
    // Act
    const code = run([ROOT, 'mark', '5', 'done', '{"version":"1.0.0"}'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(log.writes['/repo/.release/state.json']).steps[5].outputs.version, '1.0.0');
  });

  test('clear removes the state directory and the legacy file', () => {
    // Arrange
    const { deps, log } = makeDeps();
    // Act
    const code = run([ROOT, 'clear'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(log.rm, ['/repo/.release', '/repo/.release-state.json']);
  });

  test('unknown command, missing root, and bare mark exit 2', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const codes = [run([], deps), run([ROOT, 'bogus'], deps), run([ROOT, 'mark'], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
  });
});
