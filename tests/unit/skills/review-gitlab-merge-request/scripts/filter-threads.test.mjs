import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyThreads,
  discussionNodes,
  main,
  noteHead,
  parseSeverity
} from '../../../../../skills/review-gitlab-merge-request/scripts/filter-threads.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const MARKER = '<!-- cdk-review -->';
const note = (login, sha = HEAD, extra = {}) => ({
  author: { username: login },
  body: 'ok',
  position: { head_sha: sha, new_path: 'a.js', new_line: 3 },
  ...extra
});
const thread = ({
  id = 't1',
  opener = 'me',
  last = 'me',
  sha = HEAD,
  middle = [],
  body = `[major] bug\n\n${MARKER}`,
  ...rest
} = {}) => ({
  id,
  resolvable: true,
  resolved: false,
  notes: [note(opener, sha, { body }), ...middle, ...(last === opener && middle.length === 0 ? [] : [note(last, sha)])],
  ...rest
});
const base = { author: 'dev', self: 'me', head: HEAD, marker: MARKER };

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

describe('parseSeverity', () => {
  test('reads a leading severity label and rejects anything else', () => {
    // Arrange
    const bodies = ['[critical] x', '  [Nit] x', '[blocker] x', 'x [major]', undefined];
    // Act
    const result = bodies.map(parseSeverity);
    // Assert
    assert.deepEqual(result, ['critical', null, null, null, null]);
  });

  test('reads each valid severity label', () => {
    // Arrange
    const bodies = ['[major] x', '[minor] x', '[nit] x', '[question] x'];
    // Act
    const result = bodies.map(parseSeverity);
    // Assert
    assert.deepEqual(result, ['major', 'minor', 'nit', 'question']);
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

  test('does not dispute an open thread when self is the MR author', () => {
    // Arrange
    const nodes = [thread()];
    // Act
    const res = classifyThreads({ nodes, ...base, author: 'me' });
    // Assert
    assert.deepEqual([res.judged, res.unjudged], [[], ['t1']]);
  });

  test('judges an answered thread without authorLast when self is the MR author', () => {
    // Arrange
    const nodes = [thread({ middle: [note('me'), note('me')] })];
    // Act
    const res = classifyThreads({ nodes, ...base, author: 'me' });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => [t.id, t.authorLast]),
      [['t1', false]]
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
    const nodes = [thread({ middle: [note('dev'), note('me')] })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.equal(res.judged.length, 1);
  });

  test('carries the severity and whether the author spoke last', () => {
    // Arrange
    const nodes = [thread({ last: 'dev', body: `[minor] x\n\n${MARKER}` })];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => [t.severity, t.authorLast]),
      [['minor', true]]
    );
  });

  test('ignores threads that are not own or lack a valid severity prefix', () => {
    // Arrange
    const nodes = [
      thread({ id: 'foreign', opener: 'rev', last: 'dev' }),
      thread({ id: 'nomarker', last: 'dev', body: '[major] bug' }),
      thread({ id: 'noprefix', last: 'dev', body: `bug\n\n${MARKER}` })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged, res.ignored], [[], [], 3]);
  });

  test('lists own nit and question threads as non-gating without judging them', () => {
    // Arrange
    const nodes = [
      thread({ id: 'n', last: 'dev', body: `[nit] x\n\n${MARKER}` }),
      thread({ id: 'q', last: 'dev', body: `[question] x\n\n${MARKER}` })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.nongating], [[], ['n', 'q']]);
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
      thread({ id: 'r', resolved: true, resolved_by: { username: 'me' } }),
      thread({ id: 'g', resolvable: false }),
      { id: 's', resolvable: true, resolved: false, notes: [note('me', HEAD, { system: true })] }
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged, res.unjudged], [[], []]);
  });

  test('reads the flags from the notes of a REST discussion', () => {
    // Arrange
    const body = `[major] bug\n\n${MARKER}`;
    const rest = (id, flags) => ({ id, notes: [note('me', HEAD, { ...flags, body }), note('dev', HEAD, flags)] });
    const nodes = [
      rest('open', { resolvable: true, resolved: false }),
      rest('done', { resolvable: true, resolved: true, resolved_by: { username: 'me' } }),
      rest('plain', { resolvable: false })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['open']
    );
    assert.deepEqual(res.unjudged, []);
  });

  test('judges an own gating thread resolved by someone but self', () => {
    // Arrange
    const nodes = [
      thread({ id: 'dev', resolved: true, resolved_by: { username: 'dev' } }),
      thread({ id: 'mcp', resolved: true, resolvedBy: { username: 'Dev' } })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['dev', 'mcp']
    );
  });

  test('judges a REST discussion resolved by the author or by an unknown user', () => {
    // Arrange
    const body = `[major] bug\n\n${MARKER}`;
    const flags = { resolvable: true, resolved: true };
    const nodes = [
      {
        id: 'rest',
        notes: [note('me', HEAD, { ...flags, body }), note('dev', HEAD, { ...flags, resolved_by: { username: 'dev' } })]
      },
      { id: 'anon', notes: [note('me', HEAD, { ...flags, body }), note('me', HEAD, flags)] }
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual(
      res.judged.map((t) => t.id),
      ['rest', 'anon']
    );
  });

  test('skips an own gating thread resolved by self', () => {
    // Arrange
    const nodes = [
      thread({ id: 'a', resolved: true, resolved_by: { username: 'Me' } }),
      thread({ id: 'b', resolved: true, resolvedBy: { username: 'me' } }),
      thread({ id: 'control', last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged.map((t) => t.id), res.unjudged, res.nongating, res.ignored], [['control'], [], [], 0]);
  });

  test('skips a resolved thread that is not own gating even when someone else resolved it', () => {
    // Arrange
    const by = { resolved: true, resolved_by: { username: 'dev' } };
    const nodes = [
      thread({ id: 'foreign', opener: 'rev', last: 'dev', ...by }),
      thread({ id: 'nit', last: 'dev', body: `[nit] x\n\n${MARKER}`, ...by }),
      thread({ id: 'nomarker', last: 'dev', body: '[major] bug', ...by }),
      thread({ id: 'control', last: 'dev' })
    ];
    // Act
    const res = classifyThreads({ nodes, ...base });
    // Assert
    assert.deepEqual([res.judged.map((t) => t.id), res.unjudged, res.nongating, res.ignored], [['control'], [], [], 0]);
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

  test('requires the marker flag', () => {
    // Arrange
    err = [];
    const argv = ['filter', '--file', 'f.json', '--author', 'dev', '--self', 'me', '--head', HEAD];
    // Act
    const code = main(argv, deps([]));
    // Assert
    assert.equal(code, 2);
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
