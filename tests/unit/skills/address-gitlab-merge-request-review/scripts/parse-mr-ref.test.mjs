import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  main,
  parseMrRef,
  parseRemote
} from '../../../../../skills/address-gitlab-merge-request-review/scripts/parse-mr-ref.mjs';

const REMOTE = 'git@gitlab.example.com:team/app.git';

describe('parseRemote', () => {
  test('parses scp-like, ssh, and https remotes and keeps nested groups', () => {
    // Arrange
    const remotes = [
      'git@gitlab.example.com:a/b/c.git',
      'ssh://git@gl.io:2222/g/s/p.git',
      'https://token@gl.io:8443/g/p/'
    ];
    // Act
    const result = remotes.map(parseRemote);
    // Assert
    assert.deepEqual(result, [
      { ok: true, host: 'gitlab.example.com', project: 'a/b/c' },
      { ok: true, host: 'gl.io', project: 'g/s/p' },
      { ok: true, host: 'gl.io', project: 'g/p' }
    ]);
  });

  test('rejects a github.com remote and an unparsable one', () => {
    // Arrange
    const remotes = ['git@github.com:o/r.git', 'https://github.com/o/r', 'nonsense'];
    // Act
    const result = remotes.map((r) => parseRemote(r).ok);
    // Assert
    assert.deepEqual(result, [false, false, false]);
  });
});

describe('parseMrRef', () => {
  test('parses a URL with nested groups, a self-hosted host, and a trailing path', () => {
    // Arrange
    const ref = 'https://gl.example.com:8443/a/b/c/-/merge_requests/12/diffs';
    // Act
    const result = parseMrRef(ref);
    // Assert
    assert.deepEqual(result, { ok: true, host: 'gl.example.com', project: 'a/b/c', iid: 12 });
  });

  test('parses !iid, a bare iid, and project!iid against the remote', () => {
    // Arrange
    const refs = ['!7', '9', 'other/proj!3'];
    // Act
    const result = refs.map((r) => parseMrRef(r, REMOTE));
    // Assert
    assert.deepEqual(result, [
      { ok: true, host: 'gitlab.example.com', project: 'team/app', iid: 7 },
      { ok: true, host: 'gitlab.example.com', project: 'team/app', iid: 9 },
      { ok: true, host: 'gitlab.example.com', project: 'other/proj', iid: 3 }
    ]);
  });

  test('needs a remote for a short reference and rejects a github.com remote', () => {
    // Arrange
    const noRemote = parseMrRef('!7');
    const github = parseMrRef('7', 'git@github.com:o/r.git');
    // Act
    const result = [noRemote.ok, github.ok];
    // Assert
    assert.deepEqual(result, [false, false]);
  });

  test('rejects empty, unknown, github.com, traversal, and zero-iid references', () => {
    // Arrange
    const refs = [
      '',
      'abc',
      'https://github.com/o/r/-/merge_requests/1',
      'https://gl.com/a/../-/merge_requests/1',
      '0'
    ];
    // Act
    const result = refs.map((r) => parseMrRef(r, REMOTE).ok);
    // Assert
    assert.deepEqual(result, [false, false, false, false, false]);
  });
});

describe('main', () => {
  test('prints the parsed JSON and exits 0', () => {
    // Arrange
    const out = [];
    // Act
    const code = main(['!4', '--remote', REMOTE], { log: (t) => out.push(t) });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out[0]), { host: 'gitlab.example.com', project: 'team/app', iid: 4 });
  });

  test('prints {error} and exits 1 on a bad ref, 2 without an argument', () => {
    // Arrange
    const out = [];
    const errs = [];
    // Act
    const bad = main(['nope'], { log: (t) => out.push(t) });
    const none = main([], { error: (t) => errs.push(t) });
    // Assert
    assert.equal(bad, 1);
    assert.ok(JSON.parse(out[0]).error);
    assert.equal(none, 2);
    assert.match(errs[0], /usage/);
  });
});
