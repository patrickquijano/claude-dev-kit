import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { QUERIES, isAllowed, main } from '../../../../../skills/review-github-pull-request/scripts/gh-get.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const OK = [
  'user',
  'repos/acme/app/issues/42/comments',
  `repos/acme/app/contents/src/a.mjs?ref=${SHA_A}`,
  `repos/acme/app/contents/.github/workflows/ci.yml?ref=${SHA_A}`,
  `repos/acme/app/compare/${SHA_A}...${SHA_B}`
];
const BAD = [
  'users',
  '-X',
  'repos/acme/app/issues/42/comments/extra',
  'repos/acme/app/issues/42/comments?per_page=100',
  'repos/acme/app/pulls/42',
  'repos/-acme/app/issues/42/comments',
  'repos/ac%2Fme/app/issues/42/comments',
  'repos/acme/app/contents/src/a.mjs',
  'repos/acme/app/contents/src/a.mjs?ref=main',
  `repos/acme/app/contents/../x?ref=${SHA_A}`,
  `repos/acme/app/contents/src/%2e%2e/x?ref=${SHA_A}`,
  `repos/acme/app/contents/src/%2E%2E/x?ref=${SHA_A}`,
  `repos/acme/app/contents/src//a.mjs?ref=${SHA_A}`,
  `repos/acme/app/contents/./a.mjs?ref=${SHA_A}`,
  'repos/acme/app/compare/main...feature',
  `repos/acme/app/compare/${SHA_A}....${SHA_B}`,
  `repos/acme/app/compare/${SHA_A}..${SHA_B}`
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
    const endpoint = 'repos/jane_acme/app/issues/1/comments';
    // Act
    const result = isAllowed(endpoint);
    // Assert
    assert.equal(result, true);
  });

  test('rejects an owner that starts with an underscore', () => {
    // Arrange
    const endpoint = 'repos/_acme/app/issues/1/comments';
    // Act
    const result = isAllowed(endpoint);
    // Assert
    assert.equal(result, false);
  });

  test('accepts a repo name that starts with a dot', () => {
    // Arrange
    const endpoint = 'repos/acme/.github/issues/1/comments';
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
    const { out, deps } = harness({ status: 0, stdout: '{"login":"me"}', stderr: '' });
    // Act
    const code = main([OK[0]], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['api', 'user']]);
    assert.deepEqual(out.writes, ['{"login":"me"}']);
  });

  test('adds --paginate for issue comments, and the raw and diff Accept headers for contents and compare', () => {
    // Arrange
    const { out, deps } = harness({ status: 0, stdout: '', stderr: '' });
    // Act
    const codes = [main([OK[1]], deps), main([OK[2]], deps), main([OK[4]], deps)];
    // Assert
    assert.deepEqual(codes, [0, 0, 0]);
    assert.deepEqual(out.calls, [
      ['api', OK[1], '--paginate'],
      ['api', OK[2], '-H', 'Accept: application/vnd.github.raw'],
      ['api', OK[4], '-H', 'Accept: application/vnd.github.diff']
    ]);
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
    const codes = [main([BAD[0]], deps), main([BAD[1]], deps), main([BAD[9]], deps), main([BAD[11]], deps)];
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

describe('main graphql', () => {
  const harness = () => {
    const out = { calls: [], writes: [], errors: [] };
    const deps = {
      run: (args) => {
        out.calls.push(args);
        return { status: 0, stdout: '{}', stderr: '' };
      },
      write: (t) => out.writes.push(t),
      error: (t) => out.errors.push(t)
    };
    return { out, deps };
  };

  test('runs gh api graphql with the frozen query and typed variables', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'review-threads', 'acme', 'app.js', '42'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [
      ['api', 'graphql', '-f', `query=${QUERIES['review-threads']}`, '-f', 'o=acme', '-f', 'r=app.js', '-F', 'n=42']
    ]);
    assert.deepEqual(out.writes, ['{}']);
  });

  test('accepts a ten-digit number and an owner with hyphens', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'review-threads', 'my-org', '.github', '1234567890'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(out.calls.length, 1);
  });

  test('accepts a graphql owner with an underscore after the first character', () => {
    // Arrange
    const { out, deps } = harness();
    // Act
    const code = main(['graphql', 'review-threads', 'jane_acme', 'app', '7'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(out.calls.length, 1);
  });

  test('rejects prototype names, mutation, and unknown query names without running gh', () => {
    // Arrange
    const { out, deps } = harness();
    const names = ['constructor', '__proto__', 'toString', 'mutation', 'resolve-thread'];
    // Act
    const codes = names.map((n) => main(['graphql', n, 'acme', 'app', '1'], deps));
    // Assert
    assert.deepEqual(
      codes,
      names.map(() => 2)
    );
    assert.deepEqual(out.calls, []);
  });

  test('rejects a bad owner, repo, or number and extra or missing arguments without running gh', () => {
    // Arrange
    const { out, deps } = harness();
    const bad = [
      ['graphql', 'review-threads', '-acme', 'app', '1'],
      ['graphql', 'review-threads', 'ac me', 'app', '1'],
      ['graphql', 'review-threads', 'acme', 'a b', '1'],
      ['graphql', 'review-threads', 'acme', '..', '1'],
      ['graphql', 'review-threads', 'acme', '.', '1'],
      ['graphql', 'review-threads', 'acme', 'app', '0'],
      ['graphql', 'review-threads', 'acme', 'app', '1e3'],
      ['graphql', 'review-threads', 'acme', 'app', '12345678901'],
      ['graphql', 'review-threads', 'acme', 'app', '@file'],
      ['graphql', 'review-threads', 'acme', 'app', '1', 'Y3Vyc29y'],
      ['graphql', 'review-threads', 'acme', 'app'],
      ['graphql']
    ];
    // Act
    const codes = bad.map((argv) => main(argv, deps));
    // Assert
    assert.deepEqual(
      codes,
      bad.map(() => 2)
    );
    assert.deepEqual(out.calls, []);
  });

  test('exits 1 with the first stderr line when gh fails', () => {
    // Arrange
    const errors = [];
    const deps = {
      run: () => ({ status: 1, stdout: '', stderr: 'gh: boom\n' }),
      write: () => {},
      error: (t) => errors.push(t)
    };
    // Act
    const code = main(['graphql', 'review-threads', 'acme', 'app', '1'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(errors, ['gh: boom']);
  });

  test('every frozen query is a read query', () => {
    // Arrange
    const queries = Object.values(QUERIES);
    // Act
    const starts = queries.map((q) => q.startsWith('query('));
    // Assert
    assert.ok(queries.length > 0);
    assert.deepEqual(
      starts,
      queries.map(() => true)
    );
    assert.ok(Object.isFrozen(QUERIES));
  });
});
