import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/create-gitlab-issue/scripts/glab-get.mjs';

const OK = [
  'projects/g%2Fp/repository/tree?path=.gitlab/issue_templates&ref=release/1',
  'projects/7/repository/files/a%2Fb/raw?ref=main'
];
const BAD = [
  'projects/7/merge_requests/5/diffs',
  'projects/7/repository/branches/main',
  'projects/7/repository/files/a%2Fb/raw?ref=main&x=1'
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

  test('prints an empty body and exits 0 when glab succeeds with no output', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const code = main(['gitlab.example.com:8443', OK[1]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['api', '--hostname', 'gitlab.example.com:8443', OK[1]]]);
    assert.deepEqual(out.writes, ['']);
  });

  test('exits 1 with the exit status when glab fails with empty stderr', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '' });
    // Act
    const code = main(['gitlab.example.com', OK[0]], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['glab exited 1']);
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
