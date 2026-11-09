import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  main,
  parsePrRef,
  parseRemote
} from '../../../../../skills/address-github-pull-request-review/scripts/parse-pr-ref.mjs';

const REMOTE = 'git@github.com:team/app.git';

describe('parseRemote', () => {
  test('parses scp-like, ssh, and https github.com remotes', () => {
    // Arrange
    const remotes = ['git@github.com:a/b.git', 'ssh://git@github.com/g/p.git', 'https://github.com/o/r/'];
    // Act
    const result = remotes.map(parseRemote);
    // Assert
    assert.deepEqual(result, [
      { ok: true, owner: 'a', repo: 'b' },
      { ok: true, owner: 'g', repo: 'p' },
      { ok: true, owner: 'o', repo: 'r' }
    ]);
  });

  test('rejects a gitlab remote and an unparsable one', () => {
    // Arrange
    const remotes = ['git@gitlab.com:o/r.git', 'https://gitlab.com/o/r', 'nonsense'];
    // Act
    const result = remotes.map((r) => parseRemote(r).ok);
    // Assert
    assert.deepEqual(result, [false, false, false]);
  });
});

describe('parsePrRef', () => {
  test('parses a PR URL with a trailing slash', () => {
    // Arrange
    const ref = 'https://github.com/o/r/pull/12/';
    // Act
    const result = parsePrRef(ref);
    // Assert
    assert.deepEqual(result, { ok: true, owner: 'o', repo: 'r', number: 12 });
  });

  test('parses owner/repo#N and a bare number against the remote', () => {
    // Arrange
    const refs = ['x/y#3', '9'];
    // Act
    const result = refs.map((r) => parsePrRef(r, REMOTE));
    // Assert
    assert.deepEqual(result, [
      { ok: true, owner: 'x', repo: 'y', number: 3 },
      { ok: true, owner: 'team', repo: 'app', number: 9 }
    ]);
  });

  test('needs a remote for a bare number and rejects a gitlab remote', () => {
    // Arrange
    const noRemote = parsePrRef('7');
    const gitlab = parsePrRef('7', 'git@gitlab.com:o/r.git');
    // Act
    const result = [noRemote.ok, gitlab.ok];
    // Assert
    assert.deepEqual(result, [false, false]);
  });

  test('rejects empty, unknown, gitlab, traversal, and zero-number references', () => {
    // Arrange
    const refs = ['', 'abc', 'https://gitlab.com/o/r/pull/1', 'https://github.com/o/../pull/1', '0'];
    // Act
    const result = refs.map((r) => parsePrRef(r, REMOTE).ok);
    // Assert
    assert.deepEqual(result, [false, false, false, false, false]);
  });
});

describe('main', () => {
  test('prints the parsed JSON and exits 0', () => {
    // Arrange
    const out = [];
    // Act
    const code = main(['4', '--remote', REMOTE], { log: (t) => out.push(t) });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out[0]), { owner: 'team', repo: 'app', number: 4 });
  });

  test('prints the parsed JSON for a URL ref without --remote', () => {
    // Arrange
    const out = [];
    // Act
    const code = main(['https://github.com/o/r/pull/3'], { log: (t) => out.push(t) });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out[0]), { owner: 'o', repo: 'r', number: 3 });
  });

  test('prints {error} and exits 1 on a bad ref', () => {
    // Arrange
    const out = [];
    // Act
    const bad = main(['nope'], { log: (t) => out.push(t) });
    // Assert
    assert.equal(bad, 1);
    assert.ok(JSON.parse(out[0]).error);
  });

  test('prints usage and exits 2 without an argument', () => {
    // Arrange
    const errs = [];
    // Act
    const none = main([], { error: (t) => errs.push(t) });
    // Assert
    assert.equal(none, 2);
    assert.match(errs[0], /usage/);
  });
});
