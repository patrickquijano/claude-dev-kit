import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { candidates, isBreaking, main } from '../../../../../skills/update-changelog/scripts/release-candidates.mjs';

const bumps = (r) => r.candidates.map((c) => `${c.bump}:${c.version}`);

describe('isBreaking', () => {
  test('flags Removed regardless of case', () => {
    // Arrange
    const type = 'removed';
    // Act
    const result = isBreaking(type);
    // Assert
    assert.equal(result, true);
  });

  test('flags a type ending in !', () => {
    // Arrange
    const type = 'feat!';
    // Act
    const result = isBreaking(type);
    // Assert
    assert.equal(result, true);
  });

  test('does not flag Added', () => {
    // Arrange
    const type = 'Added';
    // Act
    const result = isBreaking(type);
    // Assert
    assert.equal(result, false);
  });

  test('does not flag Fixed', () => {
    // Arrange
    const type = 'Fixed';
    // Act
    const result = isBreaking(type);
    // Assert
    assert.equal(result, false);
  });
});

describe('candidates', () => {
  test('offers major, minor, and patch for a breaking and Added range', () => {
    // Arrange
    const input = { latest: '1.2.3', types: ['Removed', 'Added'] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(bumps(result), ['major:2.0.0', 'minor:1.3.0', 'patch:1.2.4']);
  });

  test('shifts down one level while the major is 0', () => {
    // Arrange
    const input = { latest: '0.4.1', types: ['Removed', 'Added'] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(bumps(result), ['minor:0.5.0', 'patch:0.4.2']);
  });

  test('offers 0.1.0 and 1.0.0 when nothing is released', () => {
    // Arrange
    const input = { latest: null, types: ['Added'] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(
      result.candidates.map((c) => c.version),
      ['0.1.0', '1.0.0']
    );
  });

  test('drops a pre-release suffix from the latest version', () => {
    // Arrange
    const input = { latest: '1.0.0-rc.1', types: ['Fixed'] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(bumps(result), ['patch:1.0.1']);
  });

  test('rejects a non-version latest', () => {
    // Arrange
    const input = { latest: 'v1', types: [] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual([result.ok, result.errors[0].code], [false, 'invalid-version']);
  });

  test('offers only patch when nothing breaks or adds', () => {
    // Arrange
    const input = { latest: '2.0.0', types: ['Fixed', ''] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(bumps(result), ['patch:2.0.1']);
  });
});

describe('main', () => {
  const run = (argv) => {
    const logs = [];
    const errors = [];
    const code = main(argv, { log: (t) => logs.push(t), error: (t) => errors.push(t) });
    return { code, logs, errors };
  };

  test('prints candidates JSON and exits 0', () => {
    // Arrange
    const argv = ['candidates', '--latest', '1.0.0', '--types', 'Added,Fixed'];
    // Act
    const { code, logs } = run(argv);
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).candidates[0].version], [0, '1.1.0']);
  });

  test('treats `none` as no release', () => {
    // Arrange
    const argv = ['candidates', '--latest', 'none', '--types', ''];
    // Act
    const { code, logs } = run(argv);
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).latest], [0, null]);
  });

  test('prints usage and exits 2 without --latest', () => {
    // Arrange
    const argv = ['candidates'];
    // Act
    const { code, errors } = run(argv);
    // Assert
    assert.deepEqual([code, errors.length], [2, 1]);
  });

  test('exits 1 for an invalid latest version', () => {
    // Arrange
    const argv = ['candidates', '--latest', 'abc'];
    // Act
    const { code } = run(argv);
    // Assert
    assert.equal(code, 1);
  });
});
