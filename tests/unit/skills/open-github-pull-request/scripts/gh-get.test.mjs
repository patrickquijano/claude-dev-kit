import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/open-github-pull-request/scripts/gh-get.mjs';

const OK = 'repos/acme/app/contents/.github/pull_request_template.md?ref=main';

describe('isAllowed', () => {
  test('accepts a contents path with a ref', () => {
    // Arrange
    const endpoints = [
      OK,
      'repos/acme/app/contents/.github/PULL_REQUEST_TEMPLATE?ref=release/1.x',
      'repos/acme_corp/app/contents/docs/a+b@c.md?ref=feat/x-1.2+3'
    ];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [true, true, true]);
  });

  test('rejects other endpoints, a missing ref, and extra query parameters', () => {
    // Arrange
    const endpoints = [
      'user',
      'repos/acme/app/contents/a.md',
      'repos/acme/app/contents/a.md?ref=',
      'repos/acme/app/contents/a.md?ref=main&x=1',
      'repos/acme/app/contents/?ref=main',
      'repos/acme/app/releases/12345'
    ];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [false, false, false, false, false, false]);
  });

  test('rejects traversal, encoded dots, and a bad owner', () => {
    // Arrange
    const endpoints = [
      'repos/acme/app/contents/../x?ref=main',
      'repos/acme/app/contents/a/%2e%2e/x?ref=main',
      'repos/acme/app/contents/a/%2E/x?ref=main',
      'repos/acme/app/contents/./a.md?ref=main',
      'repos/acme/app/contents/a.md?ref=a..b',
      'repos/-acme/app/contents/a.md?ref=main',
      'repos/ac%2Fme/app/contents/a.md?ref=main'
    ];
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
    const { out, deps } = harness({ status: 0, stdout: '{"type":"file"}', stderr: '' });
    // Act
    const code = main([OK], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['api', OK]]);
    assert.deepEqual(out.writes, ['{"type":"file"}']);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\ngh: Not Found (HTTP 404)\nmore' });
    // Act
    const code = main([OK], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: Not Found (HTTP 404)']);
  });

  test('exits 2 without running gh for a disallowed endpoint', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main(['user'], deps), main(['-X'], deps), main(['repos/acme/app/contents/../x?ref=main'], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });

  test('exits 2 without running gh for extra or missing arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([OK, '-X', 'DELETE'], deps), main([OK, '--jq', '.sha'], deps), main([], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});
