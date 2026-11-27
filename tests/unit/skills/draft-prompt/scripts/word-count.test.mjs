import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countWords, main } from '../../../../../skills/draft-prompt/scripts/word-count.mjs';

const run = (argv, stdin) => {
  const out = { logs: [], errors: [] };
  const code = main(argv, {
    readStdin: () => stdin,
    log: (t) => out.logs.push(t),
    error: (t) => out.errors.push(t)
  });
  return { code, ...out };
};

describe('countWords', () => {
  test('counts words across lines', () => {
    // Arrange
    const text = 'Add retry\nto `fetchUser` now';
    // Act
    const result = countWords(text);
    // Assert
    assert.equal(result, 5);
  });

  test('skips fence marker lines', () => {
    // Arrange
    const text = '```text\nOne two\n```';
    // Act
    const result = countWords(text);
    // Assert
    assert.equal(result, 2);
  });

  test('returns 0 for empty input', () => {
    // Arrange
    const text = '';
    // Act
    const result = countWords(text);
    // Assert
    assert.equal(result, 0);
  });

  test('returns 0 for whitespace only and for undefined', () => {
    // Arrange
    const text = ' \n\t ';
    // Act
    const result = [countWords(text), countWords(undefined)];
    // Assert
    assert.deepEqual(result, [0, 0]);
  });
});

describe('main', () => {
  test('exits 0 at the default limit', () => {
    // Arrange
    const stdin = 'a '.repeat(250);
    // Act
    const result = run([], stdin);
    // Assert
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.logs[0]), { ok: true, words: 250, limit: 250 });
  });

  test('honors a custom limit', () => {
    // Arrange
    const stdin = 'one two three';
    // Act
    const result = run(['--limit', '3'], stdin);
    // Assert
    assert.equal(result.code, 0);
  });

  test('exits 1 over the limit', () => {
    // Arrange
    const stdin = 'a '.repeat(251);
    // Act
    const result = run([], stdin);
    // Assert
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.logs[0]).ok, false);
  });

  test('exits 2 on a bad limit', () => {
    // Arrange
    const argv = ['--limit', 'abc'];
    // Act
    const result = run(argv, 'x');
    // Assert
    assert.equal(result.code, 2);
    assert.equal(result.logs.length, 0);
    assert.equal(result.errors.length, 1);
  });

  test('counts the file named by --file and ignores stdin', () => {
    // Arrange
    const out = { logs: [], errors: [] };
    const paths = [];
    // Act
    const code = main(['--file', '/s/draft.txt'], {
      readStdin: () => 'ignored words here',
      readFile: (p) => {
        paths.push(p);
        return 'one two';
      },
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(paths, ['/s/draft.txt']);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, words: 2, limit: 250 });
  });

  test('exits 2 on --file without a path or with a flag as the path', () => {
    // Act
    const results = [run(['--file'], 'x'), run(['--file', '--limit', '3'], 'x')];
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2]
    );
  });

  test('exits 2 on a relative or ..-segment --file path without reading it', () => {
    // Arrange
    const reads = [];
    const read = (argv) => {
      const out = { logs: [], errors: [] };
      const code = main(argv, {
        readFile: (p) => reads.push(p),
        log: (t) => out.logs.push(t),
        error: (t) => out.errors.push(t)
      });
      return { code, ...out };
    };
    // Act
    const results = [read(['--file', 'draft.txt']), read(['--file', '/s/../etc/passwd'])];
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2]
    );
    assert.deepEqual(reads, []);
    assert.deepEqual(
      results.map((r) => r.errors.length),
      [1, 1]
    );
  });

  test('exits 2 on a --file path with a space without reading it', () => {
    // Arrange
    const reads = [];
    const out = { logs: [], errors: [] };
    // Act
    const code = main(['--file', '/s/a b.txt'], {
      readFile: (p) => reads.push(p),
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(reads, []);
    assert.equal(out.errors.length, 1);
  });

  test('exits 2 on a --file path with shell metacharacters without reading it', () => {
    // Arrange
    const reads = [];
    const out = { logs: [], errors: [] };
    // Act
    const code = main(['--file', '/s/$(id).txt'], {
      readFile: (p) => reads.push(p),
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(reads, []);
    assert.equal(out.errors.length, 1);
  });

  test('exits 2 on a missing limit value', () => {
    // Arrange
    const argv = ['--limit'];
    // Act
    const result = run(argv, 'x');
    // Assert
    assert.equal(result.code, 2);
  });
});
