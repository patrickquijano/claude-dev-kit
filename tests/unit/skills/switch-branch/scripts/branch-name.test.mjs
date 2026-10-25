import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { freeName, main, nameError } from '../../../../../skills/switch-branch/scripts/branch-name.mjs';

describe('nameError', () => {
  test('accepts a typed hyphenated name', () => {
    // Arrange
    const names = ['feat/add-login', 'fix/x', 'chore/bump-deps-2'];
    // Act
    const result = names.map(nameError);
    // Assert
    assert.deepEqual(result, [null, null, null]);
  });

  test('accepts a name of exactly 72 chars', () => {
    // Arrange
    const name = `feat/${'a'.repeat(67)}`;
    // Act
    const result = nameError(name);
    // Assert
    assert.equal(result, null);
  });

  test('rejects an unknown type, uppercase, and a missing type', () => {
    // Arrange
    const names = ['wip/thing', 'feat/Add-Login', 'add-login'];
    // Act
    const result = names.map((n) => nameError(n) !== null);
    // Assert
    assert.deepEqual(result, [true, true, true]);
  });

  test('rejects a name over 72 chars and trailing or double hyphens', () => {
    // Arrange
    const names = [`feat/${'a'.repeat(68)}`, 'feat/a-', 'feat/a--b'];
    // Act
    const result = names.map((n) => nameError(n) !== null);
    // Assert
    assert.deepEqual(result, [true, true, true]);
  });
});

describe('freeName', () => {
  test('returns the name when it is free', () => {
    // Arrange
    const taken = () => false;
    // Act
    const result = freeName('feat/a', taken);
    // Assert
    assert.equal(result, 'feat/a');
  });

  test('appends the first free suffix', () => {
    // Arrange
    const used = new Set(['feat/a', 'feat/a-2']);
    // Act
    const result = freeName('feat/a', (n) => used.has(n));
    // Assert
    assert.equal(result, 'feat/a-3');
  });

  test('truncates the base so the suffix fits in 72 chars', () => {
    // Arrange
    const name = `feat/${'a'.repeat(67)}`;
    // Act
    const result = freeName(name, (n) => n === name);
    // Assert
    assert.deepEqual([result.length, result.endsWith('-2')], [72, true]);
  });

  test('returns null when every suffix is taken', () => {
    // Arrange
    const taken = () => true;
    // Act
    const result = freeName('feat/a', taken);
    // Assert
    assert.equal(result, null);
  });
});

describe('main', () => {
  const run = (argv, deps) => {
    const out = [];
    const code = main(argv, { localExists: () => false, remoteExists: () => false, log: (t) => out.push(t), ...deps });
    return { code, out: JSON.parse(out[0]) };
  };

  test('prints a free name unchanged', () => {
    // Arrange
    const argv = ['--name', 'feat/a'];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.deepEqual([code, out.name, out.renamed], [0, 'feat/a', false]);
  });

  test('suffixes a name taken on the remote', () => {
    // Arrange
    const argv = ['--name', 'feat/a'];
    // Act
    const { out } = run(argv, { remoteExists: (n) => n === 'feat/a' });
    // Assert
    assert.deepEqual([out.name, out.renamed], ['feat/a-2', true]);
  });

  test('skips the remote check with --no-remote', () => {
    // Arrange
    const argv = ['--name', 'feat/a', '--no-remote'];
    // Act
    const { out } = run(argv, { remoteExists: () => true });
    // Assert
    assert.equal(out.name, 'feat/a');
  });

  test('exits 1 for an invalid name', () => {
    // Arrange
    const argv = ['--name', 'Feat/A'];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.deepEqual([code, out.code], [1, 'invalid-name']);
  });

  test('exits 1 when no free suffix is left', () => {
    // Arrange
    const argv = ['--name', 'feat/a'];
    // Act
    const { code, out } = run(argv, { localExists: () => true });
    // Assert
    assert.deepEqual([code, out.code], [1, 'suffix-cap']);
  });
});
