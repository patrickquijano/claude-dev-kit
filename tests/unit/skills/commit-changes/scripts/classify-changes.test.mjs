import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classify,
  isSecret,
  main,
  parseNumstat,
  parseStatus
} from '../../../../../skills/commit-changes/scripts/classify-changes.mjs';

const entry = (path, xy = ' M') => ({ x: xy[0], y: xy[1], path });
const stat = (path, added = 1, deleted = 0) => ({ added, deleted, binary: false, path });

describe('parseStatus', () => {
  test('reads modified and untracked records', () => {
    // Arrange
    const text = ' M a.js\0?? b/c.js\0';
    // Act
    const result = parseStatus(text);
    // Assert
    assert.deepEqual(result, [entry('a.js'), entry('b/c.js', '??')]);
  });

  test('skips the origin path that follows a rename', () => {
    // Arrange
    const text = 'R  new.js\0old.js\0 M x.js\0';
    // Act
    const result = parseStatus(text);
    // Assert
    assert.deepEqual(
      result.map((e) => e.path),
      ['new.js', 'x.js']
    );
  });

  test('returns nothing for empty output', () => {
    // Arrange
    const text = '';
    // Act
    const result = parseStatus(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('does not skip the next record after a plain add', () => {
    // Arrange
    const text = 'A  a.js\0 M b.js\0';
    // Act
    const result = parseStatus(text);
    // Assert
    assert.equal(result.length, 2);
  });
});

describe('parseNumstat', () => {
  test('reads counts and paths', () => {
    // Arrange
    const text = '3\t1\ta.js\n0\t5\tdir/b.js\n';
    // Act
    const result = parseNumstat(text);
    // Assert
    assert.deepEqual(result, [stat('a.js', 3, 1), stat('dir/b.js', 0, 5)]);
  });

  test('marks a binary file', () => {
    // Arrange
    const text = '-\t-\timg.png\n';
    // Act
    const result = parseNumstat(text);
    // Assert
    assert.deepEqual(result, [{ added: 0, deleted: 0, binary: true, path: 'img.png' }]);
  });

  test('returns nothing for empty output', () => {
    // Arrange
    const text = '\n';
    // Act
    const result = parseNumstat(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('does not mark a file with one dash as binary', () => {
    // Arrange
    const text = '-\t2\tweird.js\n';
    // Act
    const [result] = parseNumstat(text);
    // Assert
    assert.equal(result.binary, false);
  });
});

describe('isSecret', () => {
  test('flags secret file names', () => {
    // Arrange
    const names = ['.env', 'cfg/.env.local', 'keys/server.pem', 'id_ed25519'];
    // Act
    const result = names.map((n) => isSecret(n));
    // Assert
    assert.deepEqual(result, [true, true, true, true]);
  });

  test('flags secret content', () => {
    // Arrange
    const texts = ['x = "AKIAABCDEFG"', '-----BEGIN PRIVATE KEY-----', 'token ghp_abc'];
    // Act
    const result = texts.map((t) => isSecret('a.js', t));
    // Assert
    assert.deepEqual(result, [true, true, true]);
  });

  test('passes a normal file', () => {
    // Arrange
    const name = 'src/index.js';
    // Act
    const result = isSecret(name, 'const a = 1;');
    // Assert
    assert.equal(result, false);
  });

  test('does not flag a name that only contains env', () => {
    // Arrange
    const name = 'src/environment.js';
    // Act
    const result = isSecret(name);
    // Assert
    assert.equal(result, false);
  });
});

describe('classify', () => {
  test('small for few light files in one directory', () => {
    // Arrange
    const input = { entries: [entry('src/a.js'), entry('src/b.js')], stats: [stat('src/a.js'), stat('src/b.js')] };
    // Act
    const result = classify(input);
    // Assert
    assert.deepEqual([result.path, result.reasons], ['small', []]);
  });

  test('small for root files only', () => {
    // Arrange
    const input = { entries: [entry('a.md'), entry('b.md')], stats: [stat('a.md')] };
    // Act
    const result = classify(input);
    // Assert
    assert.equal(result.path, 'small');
  });

  test('analyzed for more than 5 files or 150 lines', () => {
    // Arrange
    const many = Array.from({ length: 6 }, (_, i) => entry(`s/${i}.js`));
    const big = { entries: [entry('s/a.js')], stats: [stat('s/a.js', 100, 51)] };
    // Act
    const results = [classify({ entries: many, stats: [] }), classify(big)];
    // Assert
    assert.deepEqual(
      results.map((r) => r.reasons),
      [['more-than-5-files'], ['more-than-150-lines']]
    );
  });

  test('analyzed for binary, delete, lockfile, two directories, hints, and secrets', () => {
    // Arrange
    const bin = { entries: [entry('a.png')], stats: [{ added: 0, deleted: 0, binary: true, path: 'a.png' }] };
    const del = { entries: [entry('a.js', ' D')], stats: [] };
    const lock = { entries: [entry('package-lock.json')], stats: [] };
    const dirs = { entries: [entry('a/x.js'), entry('b/y.js')], stats: [] };
    // Act
    const reasons = [
      bin,
      del,
      lock,
      dirs,
      { entries: [], stats: [], hints: true },
      { entries: [], stats: [], secrets: ['.env'] }
    ].map((i) => classify(i).reasons[0]);
    // Assert
    assert.deepEqual(reasons, [
      'binary',
      'delete-or-rename',
      'lockfile-ci-migration-or-infra-path',
      'several-top-level-dirs',
      'grouping-hints',
      'secret-pattern'
    ]);
  });
});

describe('main', () => {
  const run = (argv, git, readFile = () => 'ok') => {
    const out = [];
    const calls = [];
    const code = main(argv, {
      git: (args) => {
        calls.push(args);
        return git(args);
      },
      readFile,
      log: (t) => out.push(t)
    });
    return { code, calls, out: JSON.parse(out[0]) };
  };
  const clean = (args) =>
    args[0] === 'status' ? ' M src/a.js\0' : args[1] === 'HEAD' && args[2] === '--numstat' ? '2\t1\tsrc/a.js\n' : '';

  test('prints small for a light tracked change', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, clean);
    // Assert
    assert.deepEqual([code, out.path, out.files, out.lines], [0, 'small', 1, 3]);
  });

  test('scopes git to --paths', () => {
    // Arrange
    const argv = ['--paths', 'src/a.js'];
    // Act
    const { calls } = run(argv, clean);
    // Assert
    assert.deepEqual(calls[0].slice(-2), ['--', 'src/a.js']);
  });

  test('goes analyzed when a git read fails', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, () => {
      throw new Error('git status failed');
    });
    // Assert
    assert.deepEqual([code, out.path, out.reasons], [0, 'analyzed', ['read-failed']]);
  });

  test('goes analyzed when an untracked file holds a secret', () => {
    // Arrange
    const argv = [];
    const git = (args) => (args[0] === 'status' ? '?? notes.txt\0' : '');
    // Act
    const { out } = run(argv, git, () => 'key = ghp_abc');
    // Assert
    assert.deepEqual([out.path, out.secrets], ['analyzed', ['notes.txt']]);
  });
});
