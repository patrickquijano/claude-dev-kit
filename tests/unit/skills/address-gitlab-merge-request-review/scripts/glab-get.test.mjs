import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/address-gitlab-merge-request-review/scripts/glab-get.mjs';

const OK = [
  'projects/g%2Fp/merge_requests/5/discussions?per_page=100&page=2',
  'projects/g%2Fp/merge_requests/5/diffs?per_page=100&page=1',
  'projects/7/jobs/9/trace',
  'projects/g%2Fp/members/all/42',
  'user'
];
const BAD = [
  'projects/g%2Fp/merge_requests/5/notes',
  'projects/g%2Fp/merge_requests/5/diffs',
  'projects/g%2Fp/merge_requests/5/diffs?per_page=100&page=1&unidiff=true',
  'projects/7/merge_requests/5/reviewers/../../../user',
  'projects/g%2Fp/members/all/x',
  'projects/g%2Fp/members',
  'projects/%2e%2e/merge_requests/5/discussions?per_page=100',
  'projects/%2E%2E/jobs/9/trace',
  'users/1'
];

describe('isAllowed', () => {
  test('accepts the read-only endpoints the skill uses', () => {
    // Arrange
    const host = 'gitlab.example.com';
    // Act
    const results = OK.map((e) => isAllowed(host, e));
    // Assert
    assert.deepEqual(
      results,
      OK.map(() => true)
    );
  });

  test('accepts a host with a port', () => {
    // Arrange
    const host = 'gitlab.example.com:8443';
    // Act
    const result = isAllowed(host, OK[0]);
    // Assert
    assert.equal(result, true);
  });

  test('rejects endpoints outside the allowed shapes', () => {
    // Arrange
    const host = 'gitlab.example.com';
    // Act
    const results = BAD.map((e) => isAllowed(host, e));
    // Assert
    assert.deepEqual(
      results,
      BAD.map(() => false)
    );
  });

  test('rejects an option-like or malformed host', () => {
    // Arrange
    const hosts = ['--method', '-h', 'a b', ''];
    // Act
    const results = hosts.map((h) => isAllowed(h, OK[0]));
    // Assert
    assert.deepEqual(results, [false, false, false, false]);
  });

  test('rejects an option-like endpoint', () => {
    // Arrange
    const endpoint = '-X';
    // Act
    const result = isAllowed('gitlab.example.com', endpoint);
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

  test('runs glab api with an argument array and prints the body', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '{"ok":1}', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[0]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['api', '--hostname', 'gitlab.example.com', OK[0]]]);
    assert.deepEqual(out.writes, ['{"ok":1}']);
  });

  test('prints only the new_path array for the diffs endpoint', () => {
    // Arrange
    const body = '[{"new_path":"a.mjs","diff":"x"},{"new_path":"b/c.md","diff":"y"}]';
    const { out, deps } = harness({ status: 0, stdout: body, stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.writes, ['["a.mjs","b/c.md"]']);
  });

  test('prints a one-path array for a single diffs entry', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '[{"new_path":"a.mjs"}]', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.writes, ['["a.mjs"]']);
  });

  test('exits 1 with one error for a diffs body that is not an array of entries', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '{"message":"x"}', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(out.errors.length, 1);
    assert.deepEqual(out.writes, []);
  });

  test('prints an empty array for an empty diffs page', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '[]', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.writes, ['[]']);
  });

  test('exits 1 with one error for a diffs entry without new_path', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '[{"old_path":"a"}]', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(out.errors.length, 1);
    assert.deepEqual(out.writes, []);
  });

  test('exits 1 without output for a cut-off diffs body', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '[{"new_path":"a"', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[1]], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.writes, []);
  });

  test('exits 1 with the first stderr line when glab fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\n403 Forbidden\nmore' });
    // Act
    const code = main(['gitlab.example.com', OK[0]], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['403 Forbidden']);
  });

  test('exits 2 without running glab for a disallowed endpoint or extra arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [
      main(['gitlab.example.com', BAD[0]], deps),
      main(['gitlab.example.com', OK[0], '--method', 'DELETE'], deps),
      main([], deps)
    ];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});
