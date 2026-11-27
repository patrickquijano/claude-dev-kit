import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/create-github-release/scripts/gh-get.mjs';

const OK = [
  'repos/acme/app/compare/v1.2.3...main',
  'repos/acme/app/contents/CHANGELOG.md?ref=main',
  'repos/acme/app/contents/.github/workflows?ref=release/1.x',
  'repos/acme/app/immutable-releases',
  'repos/acme/app/releases/tags/v1.2.3',
  'repos/acme/app/releases/12345',
  'repos/acme/app/releases?per_page=30'
];
const BAD = [
  'user',
  '-X',
  'repos/acme/app/releases',
  'repos/acme/app/releases/latest',
  'repos/acme/app/releases/tags/-v1',
  'repos/acme/app/releases/12345/assets',
  'repos/acme/app/releases?per_page=30&page=2',
  'repos/acme/app/contents/CHANGELOG.md',
  'repos/acme/app/contents/../x?ref=main',
  'repos/acme/app/contents/a/%2e%2e/x?ref=main',
  'repos/acme/app/contents/a/%2E%2E/x?ref=main',
  'repos/acme/app/contents/a.md?ref=a..b',
  'repos/acme/app/contents/./a.md?ref=main',
  'repos/acme/app/compare/v1....main',
  'repos/acme/app/compare/v1..main',
  'repos/acme/app/compare/main',
  'repos/-acme/app/immutable-releases',
  'repos/ac me/app/immutable-releases',
  'repos/ac%2Fme/app/immutable-releases'
];

describe('isAllowed', () => {
  test('accepts the read-only endpoints the skill uses', () => {
    // Arrange
    const endpoints = OK;
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(
      results,
      endpoints.map(() => true)
    );
  });

  test('accepts a tag and a ref that hold dots and slashes', () => {
    // Arrange
    const endpoints = ['repos/acme/app/releases/tags/rel/1.0.0-rc.1', 'repos/acme/app/compare/v1.0.0...feat/x-1'];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('accepts a tag or ref with a plus and an owner with an underscore', () => {
    // Arrange
    const endpoints = [
      'repos/acme/app/releases/tags/v1.0.0+build.5',
      'repos/acme/app/compare/v1.0.0+1...main',
      'repos/acme/app/contents/a+b.md?ref=main',
      'repos/acme_corp/app/immutable-releases'
    ];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [true, true, true, true]);
  });

  test('rejects a plus in the contents ref value', () => {
    // Arrange
    const endpoints = ['repos/acme/app/contents/a.md?ref=v1+2', 'repos/acme/app/contents/a.md?ref=main+x'];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [false, false]);
  });

  test('rejects an owner that starts with an underscore', () => {
    // Arrange
    const endpoints = ['repos/_acme/app/immutable-releases', 'repos/_/app/releases/12345'];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [false, false]);
  });

  test('rejects endpoints outside the allowed shapes, traversal, encoded dots, and a bad owner', () => {
    // Arrange
    const endpoints = BAD;
    // Act
    const results = endpoints.map((e) => isAllowed(e));
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
    const result = isAllowed(endpoint);
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

  test('runs gh api with the endpoint alone and prints the body', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '{"enabled":true}', stderr: '' });
    // Act
    const codes = [main([OK[3]], deps), main([OK[0]], deps)];
    // Assert
    assert.deepEqual(codes, [0, 0]);
    assert.deepEqual(out.calls, [
      ['api', OK[3]],
      ['api', OK[0]]
    ]);
    assert.deepEqual(out.writes, ['{"enabled":true}', '{"enabled":true}']);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\ngh: Not Found (HTTP 404)\nmore' });
    // Act
    const code = main([OK[1]], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: Not Found (HTTP 404)']);
  });

  test('exits 2 without running gh for a disallowed endpoint', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([BAD[0]], deps), main([BAD[1]], deps), main([BAD[8]], deps), main([BAD[10]], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });

  test('exits 2 without running gh for extra or missing arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([OK[3], '-X', 'DELETE'], deps), main([OK[3], OK[4]], deps), main([], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});
