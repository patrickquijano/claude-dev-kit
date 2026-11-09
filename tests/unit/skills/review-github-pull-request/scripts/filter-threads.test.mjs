import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyThreads,
  main,
  parseSeverity,
  threadNodes
} from '../../../../../skills/review-github-pull-request/scripts/filter-threads.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const MARKER = '<!-- cdk-review -->';
const thread = ({
  id = 't1',
  opener = 'me',
  last = 'me',
  oid = HEAD,
  body = `[major] bug\n\n${MARKER}`,
  ...rest
} = {}) => ({
  id,
  isResolved: false,
  isOutdated: false,
  viewerCanResolve: true,
  path: 'a.js',
  line: 3,
  comments: { nodes: [{ author: { login: opener }, body }, ...(rest.middle ?? [])] },
  lastComment: { nodes: [{ author: { login: last }, originalCommit: { oid } }] },
  ...rest
});
const base = { author: 'dev', self: 'me', head: HEAD, marker: MARKER };

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

describe('parseSeverity', () => {
  test('reads the bracketed severity prefix', () => {
    // Arrange
    const bodies = ['[critical] x', ' [question] y', '[blocker] z', 'plain'];
    // Act
    const found = bodies.map(parseSeverity);
    // Assert
    assert.deepEqual(found, ['critical', 'question', null, null]);
  });
});

describe('classifyThreads', () => {
  test('judges an own gating thread whose last comment is by the PR author', () => {
    // Arrange
    const nodes = [thread({ last: 'Dev' })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(res.judged, [{ id: 't1', path: 'a.js', line: 3, severity: 'major', authorLast: true }]);
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

  test('ignores threads not opened by self or without the marker', () => {
    // Arrange
    const nodes = [
      thread({ id: 'other', opener: 'rev', last: 'dev' }),
      thread({ id: 'nomarker', body: '[major] bug', last: 'dev' }),
      thread({ id: 'noprefix', body: `bug\n${MARKER}`, last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged, res.ignored], [[], [], 3]);
  });

  test('lists own nit and question threads as non-gating', () => {
    // Arrange
    const nodes = [
      thread({ id: 'n', body: `[nit] x\n${MARKER}`, last: 'dev' }),
      thread({ id: 'q', body: `[question] x\n${MARKER}`, last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.nongating, res.judged], [['n', 'q'], []]);
  });

  test('leaves an own gating thread with no change since the last comment unjudged', () => {
    // Arrange
    const nodes = [thread()];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(res.unjudged, ['t1']);
  });

  test('skips threads resolved by self and lists own unresolvable ones', () => {
    // Arrange
    const nodes = [
      thread({ id: 'r', isResolved: true, resolvedBy: { login: 'Me' } }),
      thread({ id: 'u', viewerCanResolve: false })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged, res.unresolvable], [[], [], ['u']]);
  });

  test('skips a thread resolved by self while judging an unresolved control thread', () => {
    // Arrange
    const nodes = [
      thread({ id: 'r', isResolved: true, resolvedBy: { login: 'me' } }),
      thread({ id: 'j', last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['j']
    );
  });

  test('judges an own gating thread resolved by the PR author or another user', () => {
    // Arrange
    const nodes = [
      thread({ id: 'a', isResolved: true, resolvedBy: { login: 'dev' } }),
      thread({ id: 'x', isResolved: true, resolvedBy: { login: 'other' }, viewerCanResolve: false })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged.map((t) => t.id), res.unjudged, res.unresolvable], [['a', 'x'], [], []]);
  });

  test('judges a resolved own gating thread with no resolvedBy', () => {
    // Arrange
    const nodes = [thread({ id: 'n', isResolved: true })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['n']
    );
  });

  test('skips resolved nit and not-own threads whoever resolved them', () => {
    // Arrange
    const nodes = [
      thread({ id: 'n', body: `[nit] x\n${MARKER}`, isResolved: true, resolvedBy: { login: 'dev' } }),
      thread({ id: 'o', opener: 'rev', isResolved: true, resolvedBy: { login: 'dev' } })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.nongating, res.ignored], [[], [], 0]);
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
    const argv = ['filter', '--file', 'f.json', '--author', 'dev', '--self', 'me', '--head', HEAD, '--marker', MARKER];
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
