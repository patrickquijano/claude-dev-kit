import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/merge-github-pull-request/scripts/gh-get.mjs';

const PARENTS = '.parents | length';
const SHA = '9f3c2ab41d7e08a5c6b1f2e3d4a5b6c7d8e9f012';

describe('isAllowed', () => {
  test('accepts each endpoint with its one filter', () => {
    // Arrange
    const pairs = [
      ['user', '.login'],
      ['repos/acme/app/rules/branches/main', undefined],
      [`repos/acme/app/commits/${SHA}`, PARENTS],
      ['repos/acme/app/commits/9f3c2ab', PARENTS],
      ['repos/acme/app/branches/main', undefined]
    ];
    // Act
    const results = pairs.map(([e, jq]) => isAllowed(e, jq));
    // Assert
    assert.deepEqual(results, [true, true, true, true, true]);
  });

  test('accepts a ref with slashes, dots, and a plus and an owner with an underscore', () => {
    // Arrange
    const pairs = [
      ['repos/acme/app/branches/feat/x-1.2+3', undefined],
      ['repos/acme_corp/app.js/rules/branches/release/1.x', undefined]
    ];
    // Act
    const results = pairs.map(([e, jq]) => isAllowed(e, jq));
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects a mismatched, missing, or extra filter', () => {
    // Arrange
    const pairs = [
      ['user', undefined],
      ['user', '.email'],
      ['repos/acme/app/rules/branches/main', '.'],
      ['repos/acme/app/branches/main', '.name'],
      [`repos/acme/app/commits/${SHA}`, undefined],
      [`repos/acme/app/commits/${SHA}`, '.parents']
    ];
    // Act
    const results = pairs.map(([e, jq]) => isAllowed(e, jq));
    // Assert
    assert.deepEqual(results, [false, false, false, false, false, false]);
  });

  test('rejects endpoints outside the shapes, traversal, encoded dots, and a bad owner or sha', () => {
    // Arrange
    const endpoints = [
      'user/emails',
      'repos/acme/app/rules/branches/',
      'repos/acme/app/rules/branches//x',
      'repos/acme/app/branches/../x',
      'repos/acme/app/branches/a/%2e%2e/x',
      'repos/acme/app/branches/a/%2E/x',
      'repos/acme/app/branches/a/./x',
      'repos/acme/app/branches/-x',
      'repos/acme/app/branches/a?x=1',
      'repos/acme/app/merges',
      `repos/acme/app/commits/${SHA}0`,
      'repos/acme/app/commits/abc123',
      'repos/acme/app/commits/main',
      'repos/-acme/app/branches/main',
      'repos/ac me/app/branches/main',
      'repos/ac%2Fme/app/branches/main'
    ];
    // Act
    const results = endpoints.map((e) => isAllowed(e, undefined) || isAllowed(e, PARENTS) || isAllowed(e, '.login'));
    // Assert
    assert.deepEqual(
      results,
      endpoints.map(() => false)
    );
  });

  test('rejects a non-string endpoint', () => {
    // Arrange
    const endpoint = undefined;
    // Act
    const result = isAllowed(endpoint, undefined);
    // Assert
    assert.equal(result, false);
  });
});

describe('main', () => {
  const harness = (res) => {
    const out = { calls: [], writes: [], errors: [] };
    const deps = {
      run: (args) => {
        out.calls.push(args);
        return res;
      },
      write: (t) => out.writes.push(t),
      error: (t) => out.errors.push(t)
    };
    return { out, deps };
  };

  test('runs gh api with the endpoint alone, or with the one --jq filter, and prints the body', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: 'ok', stderr: '' });
    const commit = `repos/acme/app/commits/${SHA}`;
    // Act
    const codes = [
      main(['repos/acme/app/branches/main'], deps),
      main(['user', '--jq', '.login'], deps),
      main([commit, '--jq', PARENTS], deps)
    ];
    // Assert
    assert.deepEqual(codes, [0, 0, 0]);
    assert.deepEqual(out.calls, [
      ['api', 'repos/acme/app/branches/main'],
      ['api', 'user', '--jq', '.login'],
      ['api', commit, '--jq', PARENTS]
    ]);
    assert.deepEqual(out.writes, ['ok', 'ok', 'ok']);
  });

  test('exits 1 with the first stderr line when gh fails, so a 404 stays visible', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\ngh: Not Found (HTTP 404)\nmore' });
    // Act
    const code = main(['repos/acme/app/branches/gone'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: Not Found (HTTP 404)']);
  });

  test('exits 1 with a fallback message when gh fails with no stderr', () => {
    // Arrange
    const { out, deps } = harness({ status: 4, stdout: '', stderr: '' });
    // Act
    const code = main(['user', '--jq', '.login'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh exited 4']);
  });

  test('exits 2 without running gh for a disallowed endpoint or filter pair', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [
      main(['user'], deps),
      main(['repos/acme/app/branches/main', '--jq', '.name'], deps),
      main(['repos/acme/app/branches/../x'], deps),
      main(['-X'], deps)
    ];
    // Assert
    assert.deepEqual(codes, [2, 2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });

  test('exits 2 without running gh for extra, missing, or flag arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    const b = 'repos/acme/app/branches/main';
    // Act
    const codes = [
      main([b, '-X', 'DELETE'], deps),
      main([b, '-f', 'a=b'], deps),
      main([b, '--method', 'PUT'], deps),
      main([b, '--input', 'x'], deps),
      main(['user', '--jq', '.login', '-X', 'PUT'], deps),
      main(['user', '--jq'], deps),
      main([], deps)
    ];
    // Assert
    assert.deepEqual(codes, [2, 2, 2, 2, 2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});
