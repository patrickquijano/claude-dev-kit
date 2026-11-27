import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/create-github-issue/scripts/gh-get.mjs';

const OK = [
  'user',
  'repos/acme/app/contents/.github/ISSUE_TEMPLATE',
  'repos/acme/app/contents/.github/ISSUE_TEMPLATE/bug_report.md',
  'repos/acme/.github/contents/.github/ISSUE_TEMPLATE/config.yml'
];
const BAD = [
  'users',
  '-X',
  'repos/acme/app/issues/1/comments',
  'repos/acme/app/contents',
  'repos/acme/app/contents/a.md?ref=main',
  'repos/acme/app/contents/../x',
  'repos/acme/app/contents/a/%2e%2e/x',
  'repos/acme/app/contents/a/%2E%2E/x',
  'repos/acme/app/contents//a.md',
  'repos/acme/app/contents/./a.md',
  'repos/-acme/app/contents/a.md',
  'repos/ac me/app/contents/a.md',
  'repos/ac%2Fme/app/contents/a.md'
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

  test('accepts an owner with an underscore after the first character', () => {
    // Arrange
    const endpoint = 'repos/acme_corp/app/contents/a.md';
    // Act
    const result = isAllowed(endpoint);
    // Assert
    assert.equal(result, true);
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

  test('rejects an owner that starts with an underscore', () => {
    // Arrange
    const endpoint = 'repos/_o/app/contents/a.md';
    // Act
    const result = isAllowed(endpoint);
    // Assert
    assert.equal(result, false);
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

  test('runs gh api with the endpoint alone, so contents stays JSON', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '[]', stderr: '' });
    // Act
    const codes = [main([OK[0]], deps), main([OK[1]], deps)];
    // Assert
    assert.deepEqual(codes, [0, 0]);
    assert.deepEqual(out.calls, [
      ['api', OK[0]],
      ['api', OK[1]]
    ]);
    assert.deepEqual(out.writes, ['[]', '[]']);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\ngh: Not Found (HTTP 404)\nmore' });
    // Act
    const code = main([OK[2]], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: Not Found (HTTP 404)']);
  });

  test('exits 2 without running gh for a disallowed endpoint', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([BAD[0]], deps), main([BAD[1]], deps), main([BAD[5]], deps), main([BAD[7]], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });

  test('exits 2 without running gh for extra or missing arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([OK[0], '-X', 'DELETE'], deps), main([OK[0], OK[1]], deps), main([], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});
