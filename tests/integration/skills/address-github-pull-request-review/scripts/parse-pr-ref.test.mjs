import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/address-github-pull-request-review/scripts/parse-pr-ref.mjs', import.meta.url)
);
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 15_000 });

describe('parse-pr-ref CLI', () => {
  test('parses a pull request URL', () => {
    // Act
    const res = run('https://github.com/acme/widgets/pull/42');
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), { owner: 'acme', repo: 'widgets', number: 42 });
  });

  test('parses owner/repo#N', () => {
    // Act
    const res = run('acme/widgets#7');
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), { owner: 'acme', repo: 'widgets', number: 7 });
  });

  test('resolves a bare number from an scp-like remote', () => {
    // Act
    const res = run('12', '--remote', 'git@github.com:acme/widgets.git');
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), { owner: 'acme', repo: 'widgets', number: 12 });
  });

  test('resolves a bare number from an https remote', () => {
    // Act
    const res = run('3', '--remote', 'https://github.com/acme/widgets');
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), { owner: 'acme', repo: 'widgets', number: 3 });
  });

  for (const [name, args] of [
    ['a non-github host', ['https://gitlab.com/acme/widgets/pull/1']],
    ['a non-numeric number', ['https://github.com/acme/widgets/pull/abc']],
    ['number zero', ['acme/widgets#0']],
    ['a bare number without a remote', ['5']],
    ['an extra path segment', ['https://github.com/acme/widgets/pull/1/files']],
    ['a non-github remote', ['5', '--remote', 'git@gitlab.com:acme/widgets.git']],
    ['a malformed ref', ['foo/bar/pull/x']]
  ]) {
    test(`rejects ${name}`, () => {
      // Act
      const res = run(...args);
      // Assert
      assert.equal(res.status, 1);
      assert.equal(typeof JSON.parse(res.stdout).error, 'string');
    });
  }

  test('exits 2 with a usage line when no reference is given', () => {
    // Act
    const res = run();
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage:/);
  });
});
