import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main } from '../../../../../skills/setup-husky/assets/post-commit.mjs';

// Builds stub deps; `results` maps a git subcommand ("log" or "verify-commit") to its spawn result.
function makeDeps(results) {
  const logged = [];
  const calls = [];
  const deps = {
    spawn: (cmd, args) => {
      calls.push([cmd, ...args]);
      return results[args[0]];
    },
    log: (line) => logged.push(line)
  };
  return { deps, logged, calls };
}

describe('main', () => {
  test('prints a passing line with the subject when HEAD is signed', () => {
    // Arrange
    const { deps, logged } = makeDeps({
      log: { status: 0, stdout: 'feat: add x\n' },
      'verify-commit': { status: 0 }
    });
    // Act
    main(deps);
    // Assert
    assert.deepEqual(logged, ['✅ Signed: "feat: add x"']);
  });

  test('returns 0 and calls git with fixed arguments', () => {
    // Arrange
    const { deps, calls } = makeDeps({ log: { status: 0, stdout: 's' }, 'verify-commit': { status: 0 } });
    // Act
    const code = main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls, [
      ['git', 'log', '-1', '--format=%s'],
      ['git', 'verify-commit', 'HEAD']
    ]);
  });

  test('prints a failing line with the indented git error when verification fails', () => {
    // Arrange
    const { deps, logged } = makeDeps({
      log: { status: 0, stdout: 'fix: y\n' },
      'verify-commit': { status: 1, stderr: 'bad signature\nline two' }
    });
    // Act
    main(deps);
    // Assert
    assert.deepEqual(logged, ['❌ Signed: "fix: y"', '   bad signature\n   line two']);
  });

  test('falls back to a default reason when git gives no error text', () => {
    // Arrange
    const { deps, logged } = makeDeps({
      log: { status: 0, stdout: 'x\n' },
      'verify-commit': { status: 1, stderr: '' }
    });
    // Act
    main(deps);
    // Assert
    assert.equal(logged[1], '   commit has no signature');
  });

  test('still returns 0 when git cannot be spawned', () => {
    // Arrange
    const { deps, logged } = makeDeps({
      log: { status: null, stdout: undefined },
      'verify-commit': { status: null, error: new Error('spawn git ENOENT') }
    });
    // Act
    const code = main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(logged, ['❌ Signed: ""', '   spawn git ENOENT']);
  });
});
