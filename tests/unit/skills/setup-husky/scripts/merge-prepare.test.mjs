import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, mergePrepare, readPrepare, target } from '../../../../../skills/setup-husky/scripts/merge-prepare.mjs';

describe('readPrepare', () => {
  test('returns scripts.prepare', () => {
    // Act
    const result = readPrepare('{"scripts":{"prepare":"tsc && husky install"}}');
    // Assert
    assert.equal(result, 'tsc && husky install');
  });

  test('returns undefined when scripts or prepare is absent or not a string', () => {
    // Act
    const results = [readPrepare('{}'), readPrepare('{"scripts":{}}'), readPrepare('{"scripts":{"prepare":1}}')];
    // Assert
    assert.deepEqual(results, [undefined, undefined, undefined]);
  });

  test('throws on invalid JSON', () => {
    // Act
    const act = () => readPrepare('{nope');
    // Assert
    assert.throws(act, SyntaxError);
  });
});

describe('target', () => {
  test('returns husky at the git root', () => {
    // Arrange
    const pkg = '.';
    // Act
    const result = target(pkg);
    // Assert
    assert.equal(result, 'husky');
  });

  test('returns a cd form for a nested package', () => {
    // Arrange
    const pkg = 'packages/app';
    // Act
    const result = target(pkg);
    // Assert
    assert.equal(result, 'cd ../.. && husky packages/app/.husky');
  });

  test('treats an empty package as the root', () => {
    // Arrange
    const pkg = '';
    // Act
    const result = target(pkg);
    // Assert
    assert.equal(result, 'husky');
  });

  test('does not return the root form for a nested package', () => {
    // Arrange
    const pkg = 'web';
    // Act
    const result = target(pkg);
    // Assert
    assert.notEqual(result, 'husky');
  });
});

describe('mergePrepare', () => {
  test('sets the target when prepare is absent', () => {
    // Arrange
    const input = { pkg: '.' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.deepEqual(result, { prepare: 'husky', action: 'set' });
  });

  test('keeps a prepare that already holds the target', () => {
    // Arrange
    const input = { pkg: '.', existing: 'tsc && husky' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.deepEqual(result, { prepare: 'tsc && husky', action: 'unchanged' });
  });

  test('replaces a legacy husky segment and keeps the others in order', () => {
    // Arrange
    const input = { pkg: '.', existing: 'tsc && husky install && build' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.deepEqual(result, { prepare: 'tsc && husky && build', action: 'replaced' });
  });

  test('replaces a cd segment that belongs to the husky segment', () => {
    // Arrange
    const input = { pkg: 'web', existing: 'cd .. && husky install web/.husky' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.deepEqual(result, { prepare: 'cd .. && husky web/.husky', action: 'replaced' });
  });

  test('appends the target after existing commands when no husky segment exists', () => {
    // Arrange
    const input = { pkg: '.', existing: 'tsc' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.deepEqual(result, { prepare: 'tsc && husky', action: 'merged' });
  });

  test('does not touch an unrelated cd segment', () => {
    // Arrange
    const input = { pkg: '.', existing: 'cd tools && build' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.equal(result.prepare, 'cd tools && build && husky');
  });

  test('does not treat a similarly named command as husky', () => {
    // Arrange
    const input = { pkg: '.', existing: 'huskyfy run' };
    // Act
    const result = mergePrepare(input);
    // Assert
    assert.equal(result.action, 'merged');
  });
});

describe('main', () => {
  test('logs the merge result as JSON', () => {
    // Arrange
    const lines = [];
    const deps = { log: (line) => lines.push(line) };
    // Act
    const code = main(['--pkg', '.', '--existing', 'husky install'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(lines[0]), { prepare: 'husky', action: 'replaced' });
  });

  test('logs a set result for a missing existing value', () => {
    // Arrange
    const lines = [];
    const deps = { log: (line) => lines.push(line) };
    // Act
    main(['--pkg', 'web'], deps);
    // Assert
    assert.equal(JSON.parse(lines[0]).action, 'set');
  });

  test('reads the existing script from --existing-file', () => {
    // Arrange
    const lines = [];
    const deps = { log: (line) => lines.push(line), readFile: () => 'tsc && husky install\n' };
    // Act
    main(['--pkg', '.', '--existing-file', '/s/prepare.txt'], deps);
    // Assert
    assert.deepEqual(JSON.parse(lines[0]), { prepare: 'tsc && husky', action: 'replaced' });
  });

  test('reads scripts.prepare from --package-json and sets when it is absent', () => {
    // Arrange
    const lines = [];
    const paths = [];
    const deps = {
      log: (line) => lines.push(line),
      readFile: (p) => {
        paths.push(p);
        return '{"name":"x"}';
      }
    };
    // Act
    main(['--pkg', '.', '--package-json', '/r/package.json'], deps);
    // Assert
    assert.deepEqual(paths, ['/r/package.json']);
    assert.deepEqual(JSON.parse(lines[0]), { prepare: 'husky', action: 'set' });
  });

  test('throws when two existing sources are given', () => {
    // Arrange
    const deps = { log: () => {}, readFile: () => '' };
    // Act
    const act = () => main(['--pkg', '.', '--existing', 'a', '--existing-file', '/f'], deps);
    // Assert
    assert.throws(act, /use only one of/);
  });

  test('throws when --package-json is not valid JSON', () => {
    // Arrange
    const deps = { log: () => {}, readFile: () => '{nope' };
    // Act
    const act = () => main(['--pkg', '.', '--package-json', '/r/package.json'], deps);
    // Assert
    assert.throws(act, SyntaxError);
  });

  test('throws when --pkg is missing', () => {
    // Arrange
    const deps = { log: () => {} };
    // Act
    const act = () => main([], deps);
    // Assert
    assert.throws(act, /--pkg is required/);
  });

  test('throws on an unknown argument', () => {
    // Arrange
    const deps = { log: () => {} };
    // Act
    const act = () => main(['--bogus', 'x'], deps);
    // Assert
    assert.throws(act, /unknown argument/);
  });
});
