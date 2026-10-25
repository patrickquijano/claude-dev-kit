import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, mergePrepare, target } from '../../../../../skills/setup-husky/scripts/merge-prepare.mjs';

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
