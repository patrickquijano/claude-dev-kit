import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isAllowed, main } from '../../../../../skills/delete-branches/scripts/host-get.mjs';

describe('isAllowed', () => {
  test('accepts the GitHub protected-branch listing', () => {
    // Act
    const result = isAllowed('github', 'repos/acme/api/branches?protected=true');
    // Assert
    assert.equal(result, true);
  });

  test('accepts the GitHub rules lookup and the GitLab protected branches', () => {
    // Act
    const results = [
      isAllowed('github', 'repos/acme/api/rules/branches/feat%2Fx'),
      isAllowed('gitlab', 'projects/acme%2Fapi/protected_branches')
    ];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects a branch-protection endpoint', () => {
    // Act
    const results = [
      isAllowed('github', 'repos/acme/api/branches/main/protection'),
      isAllowed('gitlab', 'projects/7/protected_branches/main')
    ];
    // Assert
    assert.deepEqual(results, [false, false]);
  });

  test('rejects an unknown host kind and a path traversal', () => {
    // Act
    const results = [
      isAllowed('gitea', 'repos/acme/api/branches?protected=true'),
      isAllowed('gitlab', 'projects/../user/protected_branches'),
      isAllowed('__proto__', 'x')
    ];
    // Assert
    assert.deepEqual(results, [false, false, false]);
  });
});

describe('main', () => {
  const run = (argv, res = { status: 0, stdout: '[]', stderr: '' }) => {
    const calls = [];
    const written = [];
    const errors = [];
    const code = main(argv, {
      run: (cli, args) => {
        calls.push([cli, args]);
        return res;
      },
      write: (t) => written.push(t),
      error: (t) => errors.push(t)
    });
    return { code, calls, written, errors };
  };

  test('runs gh api with --paginate for the branches listing and prints the body', () => {
    // Act
    const { code, calls, written } = run(['github', 'repos/a/b/branches?protected=true']);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls, [['gh', ['api', 'repos/a/b/branches?protected=true', '--paginate']]]);
    assert.deepEqual(written, ['[]']);
  });

  test('runs glab api with no extra flag', () => {
    // Act
    const { code, calls } = run(['gitlab', 'projects/7/protected_branches']);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls, [['glab', ['api', 'projects/7/protected_branches']]]);
  });

  test('exits 2 without running anything on a disallowed endpoint or wrong arity', () => {
    // Act
    const results = [run(['github', 'repos/a/b/branches/main/protection']), run(['github'])];
    // Assert
    assert.deepEqual(
      results.map((r) => [r.code, r.calls.length]),
      [
        [2, 0],
        [2, 0]
      ]
    );
    assert.match(results[0].errors[0], /usage/);
  });

  test('exits 1 with the first stderr line when the CLI fails', () => {
    // Act
    const { code, errors, written } = run(['gitlab', 'projects/7/protected_branches'], {
      status: 1,
      stdout: '',
      stderr: '\n404 Not Found\nmore\n'
    });
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(errors, ['404 Not Found']);
    assert.deepEqual(written, []);
  });
});
