import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyThreads,
  discussionNodes,
  main,
  noteHead
} from '../../../../../skills/review-gitlab-merge-request/scripts/filter-threads.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const note = (login, sha = HEAD, extra = {}) => ({
  author: { username: login },
  position: { head_sha: sha, new_path: 'a.js', new_line: 3 },
  ...extra
});
const thread = ({ id = 't1', opener = 'rev', last = 'rev', sha = HEAD, middle = [], ...rest } = {}) => ({
  id,
  resolvable: true,
  resolved: false,
  notes: [note(opener, sha), ...middle, ...(last === opener && middle.length === 0 ? [] : [note(last, sha)])],
  ...rest
});
const base = { author: 'dev', self: 'me', head: HEAD };

describe('discussionNodes', () => {
  test('reads a bare REST array', () => {
    // Arrange
    const json = [{ id: 'x' }];
    // Act
    const nodes = discussionNodes(json);
    // Assert
    assert.deepEqual(nodes, [{ id: 'x' }]);
  });

  test('reads the MCP merge request response shape', () => {
    // Arrange
    const json = { discussions: { nodes: [{ id: 'y' }] } };
    // Act
    const nodes = discussionNodes(json);
    // Assert
    assert.deepEqual(nodes, [{ id: 'y' }]);
  });

  test('throws when no discussions exist', () => {
    // Arrange
    const json = { data: {} };
    // Act
    const act = () => discussionNodes(json);
    // Assert
    assert.throws(act, /no discussions/);
  });

  test('throws on null input', () => {
    // Arrange
    const json = null;
    // Act
    const act = () => discussionNodes(json);
    // Assert
    assert.throws(act, /no discussions/);
  });
});

describe('noteHead', () => {
  test('reads the REST and the camelCase head SHA', () => {
    // Arrange
    const rest = { position: { head_sha: HEAD } };
    const gql = { position: { diffRefs: { headSha: OLD } } };
    // Act
    const result = [noteHead(rest), noteHead(gql)];
    // Assert
    assert.deepEqual(result, [HEAD, OLD]);
  });

  test('returns undefined without a position', () => {
    // Arrange
    const notes = [{}, undefined];
    // Act
    const result = notes.map(noteHead);
    // Assert
    assert.deepEqual(result, [undefined, undefined]);
  });
});

describe('classifyThreads', () => {
  test('judges a thread whose last note is by the MR author', () => {
    // Arrange
    const nodes = [thread({ last: 'Dev' })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => [t.id, t.path, t.line]),
      [['t1', 'a.js', 3]]
    );
  });

  test('judges a thread written against an older head', () => {
    // Arrange
    const nodes = [thread({ id: 'c', sha: OLD })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['c']
    );
  });

  test('judges a thread whose opener answered an author reply', () => {
    // Arrange
    const nodes = [thread({ opener: 'rev', last: 'rev', middle: [note('dev'), note('rev')] })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.equal(res.judged.length, 1);
  });

  test('marks a thread resolvable only when the MR author or self opened it', () => {
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

  test('leaves a thread with no change since the last note unjudged', () => {
    // Arrange
    const nodes = [thread()];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(res.unjudged, ['t1']);
  });

  test('skips resolved, non-resolvable, and system-only discussions', () => {
    // Arrange
    const nodes = [
      thread({ id: 'r', resolved: true }),
      thread({ id: 'g', resolvable: false }),
      { id: 's', resolvable: true, resolved: false, notes: [note('rev', HEAD, { system: true })] }
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged], [[], []]);
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
