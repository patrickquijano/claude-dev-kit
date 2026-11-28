import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { clearMarker, markerPath, readMarker, writeMarker } from '../../../../../.claude/hooks/lib/reload-marker.mjs';

const P = '/tmp/cdk-reload-s1.json';
const PLUGINS = { file: 'skills/a.md', command: '/reload-plugins' };
const SKILLS = { file: 'x.md', command: '/reload-skills' };

// Stub fs: `files` maps a path to its text; a missing path throws ENOENT.
function makeDeps(files = {}) {
  const calls = { writes: [], removes: [] };
  const deps = {
    readFile: (path) => {
      if (path in files) return files[path];
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    },
    writeFile: (path, text) => calls.writes.push({ path, text }),
    remove: (path, opts) => calls.removes.push({ path, opts })
  };
  return { deps, calls };
}

describe('markerPath', () => {
  test('keys the path by session id inside the temp dir', () => {
    // Arrange
    const id = 'abc-123_X';
    // Act
    const result = markerPath(id, '/tmp');
    // Assert
    assert.equal(result, '/tmp/cdk-reload-abc-123_X.json');
  });

  test('accepts a UUID session id', () => {
    // Arrange
    const id = '54eb89e0-e316-4575-9230-a855ac4e8b75';
    // Act
    const result = markerPath(id, '/tmp');
    // Assert
    assert.equal(result, `/tmp/cdk-reload-${id}.json`);
  });

  test('returns null for a missing id', () => {
    // Arrange
    const id = undefined;
    // Act
    const result = markerPath(id, '/tmp');
    // Assert
    assert.equal(result, null);
  });

  test('returns null for an id that could escape the temp dir', () => {
    // Arrange
    const id = '../evil';
    // Act
    const result = markerPath(id, '/tmp');
    // Assert
    assert.equal(result, null);
  });
});

describe('readMarker', () => {
  test('returns the stored entries', () => {
    // Arrange
    const { deps } = makeDeps({ [P]: JSON.stringify([PLUGINS]) });
    // Act
    const result = readMarker(P, deps);
    // Assert
    assert.deepEqual(result, [PLUGINS]);
  });

  test('returns an empty list for a null path', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = readMarker(null, deps);
    // Assert
    assert.deepEqual(result, []);
  });

  test('returns an empty list when the marker does not exist', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = readMarker(P, deps);
    // Assert
    assert.deepEqual(result, []);
  });

  test('throws when the marker is not an array', () => {
    // Arrange
    const { deps } = makeDeps({ [P]: '{}' });
    // Act
    const act = () => readMarker(P, deps);
    // Assert
    assert.throws(act, TypeError);
  });

  test('throws on invalid JSON', () => {
    // Arrange
    const { deps } = makeDeps({ [P]: 'nope' });
    // Act
    const act = () => readMarker(P, deps);
    // Assert
    assert.throws(act, SyntaxError);
  });
});

describe('writeMarker', () => {
  test('writes a first entry', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    writeMarker(P, PLUGINS, deps);
    // Assert
    assert.deepEqual(calls.writes, [{ path: P, text: JSON.stringify([PLUGINS]) }]);
  });

  test('merges with an existing entry for another file', () => {
    // Arrange
    const { deps, calls } = makeDeps({ [P]: JSON.stringify([SKILLS]) });
    // Act
    writeMarker(P, PLUGINS, deps);
    // Assert
    assert.deepEqual(calls.writes[0].text, JSON.stringify([SKILLS, PLUGINS]));
  });

  test('does not duplicate the same file and command', () => {
    // Arrange
    const { deps, calls } = makeDeps({ [P]: JSON.stringify([PLUGINS]) });
    // Act
    writeMarker(P, PLUGINS, deps);
    // Assert
    assert.equal(calls.writes[0].text, JSON.stringify([PLUGINS]));
  });

  test('does nothing for a null path', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    writeMarker(null, PLUGINS, deps);
    // Assert
    assert.deepEqual(calls.writes, []);
  });
});

describe('clearMarker', () => {
  test('/reload-plugins removes the marker whatever it holds', () => {
    // Arrange
    const { deps, calls } = makeDeps({ [P]: JSON.stringify([PLUGINS, SKILLS]) });
    // Act
    clearMarker(P, '/reload-plugins', deps);
    // Assert
    assert.deepEqual(calls.removes, [{ path: P, opts: { force: true } }]);
  });

  test('/reload-skills keeps entries for another command', () => {
    // Arrange
    const { deps, calls } = makeDeps({ [P]: JSON.stringify([PLUGINS, SKILLS]) });
    // Act
    clearMarker(P, '/reload-skills', deps);
    // Assert
    assert.deepEqual(calls.writes, [{ path: P, text: JSON.stringify([PLUGINS]) }]);
    assert.deepEqual(calls.removes, []);
  });

  test('/reload-skills removes a marker holding only its entries', () => {
    // Arrange
    const { deps, calls } = makeDeps({ [P]: JSON.stringify([SKILLS]) });
    // Act
    clearMarker(P, '/reload-skills', deps);
    // Assert
    assert.equal(calls.removes.length, 1);
  });

  test('does nothing for a null path', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    clearMarker(null, '/reload-plugins', deps);
    // Assert
    assert.deepEqual([...calls.writes, ...calls.removes], []);
  });
});
