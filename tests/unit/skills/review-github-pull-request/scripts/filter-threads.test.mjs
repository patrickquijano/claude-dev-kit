import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyThreads,
  main,
  threadNodes
} from '../../../../../skills/review-github-pull-request/scripts/filter-threads.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const thread = ({ id = 't1', opener = 'rev', last = 'rev', oid = HEAD, ...rest } = {}) => ({
  id,
  isResolved: false,
  isOutdated: false,
  viewerCanResolve: true,
  path: 'a.js',
  line: 3,
  comments: { nodes: [{ author: { login: opener } }, ...(rest.middle ?? [])] },
  lastComment: { nodes: [{ author: { login: last }, originalCommit: { oid } }] },
  ...rest
});
const base = { author: 'dev', self: 'me', head: HEAD };

describe('threadNodes', () => {
  test('reads the GraphQL response shape', () => {
    // Arrange
    const json = { data: { repository: { pullRequest: { reviewThreads: { nodes: [{ id: 'x' }] } } } } };
    // Act
    const nodes = threadNodes(json);
    // Assert
    assert.deepEqual(nodes, [{ id: 'x' }]);
  });

  test('accepts a bare array', () => {
    // Arrange
    const json = [{ id: 'y' }];
    // Act
    const nodes = threadNodes(json);
    // Assert
    assert.deepEqual(nodes, [{ id: 'y' }]);
  });

  test('throws when no nodes exist', () => {
    // Arrange
    const json = { data: {} };
    // Act
    const act = () => threadNodes(json);
    // Assert
    assert.throws(act, /no reviewThreads nodes/);
  });

  test('throws on null input', () => {
    // Arrange
    const json = null;
    // Act
    const act = () => threadNodes(json);
    // Assert
    assert.throws(act, /no reviewThreads nodes/);
  });
});

describe('classifyThreads', () => {
  test('judges a thread whose last comment is by the PR author', () => {
    // Arrange
    const nodes = [thread({ last: 'Dev' })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['t1']
    );
  });

  test('judges an outdated thread and a thread from an older commit', () => {
    // Arrange
    const nodes = [thread({ id: 'o', isOutdated: true }), thread({ id: 'c', oid: OLD })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['o', 'c']
    );
  });

  test('marks a thread resolvable only when the PR author or self opened it', () => {
    // Arrange
    const nodes = [
      thread({ id: 'mine', opener: 'me', last: 'dev' }),
      thread({ id: 'theirs', opener: 'rev', last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => [t.id, t.resolvable]),
      [
        ['mine', true],
        ['theirs', false]
      ]
    );
  });

  test('leaves a thread with no change since the last comment unjudged', () => {
    // Arrange
    const nodes = [thread()];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(res.unjudged, ['t1']);
  });

  test('skips resolved threads and lists unresolvable ones', () => {
    // Arrange
    const nodes = [thread({ id: 'r', isResolved: true }), thread({ id: 'u', viewerCanResolve: false })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged, res.unresolvable], [[], [], ['u']]);
  });

  test('flags a full page as truncated', () => {
    // Arrange
    const nodes = Array.from({ length: 100 }, (_, i) => thread({ id: `t${i}` }));
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.equal(res.truncated, true);
  });
});

describe('main', () => {
  const deps = (json) => ({
    readFileSync: () => JSON.stringify(json),
    log: (t) => out.push(t),
    error: (t) => err.push(t)
  });
  let out = [];
  let err = [];

  test('prints the classification and exits 0', () => {
    // Arrange
    out = [];
    const argv = ['filter', '--file', 'f.json', '--author', 'dev', '--self', 'me', '--head', HEAD];
    // Act
    const code = main(argv, deps([thread({ last: 'dev' })]));
    // Assert
    assert.deepEqual([code, JSON.parse(out[0]).judged.length], [0, 1]);
  });

  test('reports usage and exits 2 on a missing flag', () => {
    // Arrange
    err = [];
    const argv = ['filter', '--file', 'f.json'];
    // Act
    const code = main(argv, deps([]));
    // Assert
    assert.deepEqual([code, err.length], [2, 1]);
  });

  test('reports usage and exits 2 on an unknown command', () => {
    // Arrange
    err = [];
    // Act
    const code = main(['nope'], deps([]));
    // Assert
    assert.equal(code, 2);
  });
});
