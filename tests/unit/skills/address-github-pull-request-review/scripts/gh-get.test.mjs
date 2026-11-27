import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  QUERIES,
  graphqlArgs,
  isAllowed,
  main
} from '../../../../../skills/address-github-pull-request-review/scripts/gh-get.mjs';

const BAD = [
  'users',
  '-X',
  'user/emails',
  'user?per_page=1',
  'repos/acme/app/issues/42/comments',
  'repos/acme/../user',
  '%2e%2e/user',
  '%2E%2E/user',
  'graphql'
];

describe('isAllowed', () => {
  test('accepts the user endpoint', () => {
    // Arrange
    const endpoint = 'user';
    // Act
    const result = isAllowed(endpoint);
    // Assert
    assert.equal(result, true);
  });

  test('rejects a differently cased or padded user endpoint', () => {
    // Arrange
    const endpoints = ['User', ' user', 'user '];
    // Act
    const results = endpoints.map((e) => isAllowed(e));
    // Assert
    assert.deepEqual(results, [false, false, false]);
  });

  test('rejects other endpoints, graphql, traversal, and encoded dots including uppercase', () => {
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
    const endpoint = null;
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
    const { out, deps } = harness({ status: 0, stdout: '{"login":"me"}', stderr: '' });
    // Act
    const code = main(['user'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['api', 'user']]);
    assert.deepEqual(out.writes, ['{"login":"me"}']);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: '\ngh: HTTP 401\nmore' });
    // Act
    const code = main(['user'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: HTTP 401']);
  });

  test('exits 2 without running gh for a disallowed endpoint', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([BAD[0]], deps), main([BAD[1]], deps), main([BAD[7]], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });

  test('exits 2 without running gh for extra or missing arguments', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main(['user', '-X', 'DELETE'], deps), main(['user', 'user'], deps), main([], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.deepEqual(out.calls, []);
  });
});

describe('graphql mode', () => {
  const harness = (res = { status: 0, stdout: '{}', stderr: '' }) => {
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

  test('runs the exact argv for review-threads without a cursor', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'review-threads', 'acme', 'my.app', '42'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [
      ['api', 'graphql', '-f', `query=${QUERIES['review-threads']}`, '-f', 'o=acme', '-f', 'r=my.app', '-F', 'n=42']
    ]);
  });

  test('accepts an owner with an underscore after the first character', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'pr-files', 'acme_corp', 'app', '7'], deps);
    // Assert
    assert.equal(code, 0);
    assert.ok(out.calls[0].includes('o=acme_corp'));
  });

  test('rejects an owner that starts with an underscore with no run', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'pr-files', '_o', 'app', '7'], deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(out.calls, []);
  });

  test('adds the cursor as -f c= for pr-files', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'pr-files', 'acme', 'app', '7', 'Y3Vyc29yOnYyOpHOAB=='], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls[0].slice(-2), ['-f', 'c=Y3Vyc29yOnYyOpHOAB==']);
    assert.equal(out.calls[0][3], `query=${QUERIES['pr-files']}`);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const { out, deps } = harness({ status: 1, stdout: '', stderr: 'gh: HTTP 502\nmore' });
    // Act
    const code = main(['graphql', 'pr-files', 'acme', 'app', '7'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out.errors, ['gh: HTTP 502']);
  });

  test('rejects prototype names, mutation, and unknown query names with no run', () => {
    // Arrange
    const { out, deps } = harness();
    const names = ['constructor', '__proto__', 'toString', 'mutation', 'thread-reply', ''];
    // Act
    const codes = names.map((n) => main(['graphql', n, 'acme', 'app', '1'], deps));
    // Assert
    assert.deepEqual(
      codes,
      names.map(() => 2)
    );
    assert.deepEqual(out.calls, []);
  });

  test('rejects a bad owner, repo, number, cursor, file argument, and extra args with no run', () => {
    // Arrange
    const { out, deps } = harness();
    const bad = [
      ['pr-files', '-bad', 'app', '1'],
      ['pr-files', 'a b', 'app', '1'],
      ['pr-files', 'acme', 'a b', '1'],
      ['pr-files', 'acme', '..', '1'],
      ['pr-files', 'acme', 'app', '0'],
      ['pr-files', 'acme', 'app', '1e3'],
      ['pr-files', 'acme', 'app', '12345678901'],
      ['pr-files', 'acme', 'app', '@file'],
      ['pr-files', 'acme', 'app', '1', 'bad cursor!'],
      ['pr-files', 'acme', 'app', '1', 'a'.repeat(201)],
      ['pr-files', 'acme', 'app', '1', 'abc', 'extra'],
      ['pr-files', 'acme', 'app'],
      ['pr-files']
    ];
    // Act
    const codes = bad.map((a) => main(['graphql', ...a], deps));
    // Assert
    assert.deepEqual(
      codes,
      bad.map(() => 2)
    );
    assert.deepEqual(out.calls, []);
  });

  test('every query is a read-only query and graphqlArgs returns undefined for a missing name', () => {
    // Arrange
    const texts = Object.values(QUERIES);
    // Act
    const result = graphqlArgs([]);
    // Assert
    assert.ok(Object.isFrozen(QUERIES));
    assert.ok(texts.length === 2 && texts.every((q) => q.startsWith('query(')));
    assert.equal(result, undefined);
  });
});
