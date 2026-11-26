import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { countText, isSafePath, main, mean } from '../../../../../skills/audit-subagent/scripts/count.mjs';

describe('isSafePath', () => {
  test('accepts an absolute path of safe characters', () => {
    // Act
    const results = [isSafePath('/a/agents/x.md'), isSafePath('/x/my-agent_1.md')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects relative, dotdot, and metacharacter paths', () => {
    // Act
    const results = [
      isSafePath('a/b'),
      isSafePath('/a/../b'),
      isSafePath('/a/b;rm'),
      isSafePath("/a/'b"),
      isSafePath('/a b')
    ];
    // Assert
    assert.deepEqual(results, [false, false, false, false, false]);
  });
});

describe('countText', () => {
  test('counts lines, chars, and words, ignoring a trailing newline', () => {
    // Act
    const result = countText('one two\nthree\n');
    // Assert
    assert.deepEqual(result, { lines: 2, chars: 14, words: 3, bodyLines: 2, bodyChars: 14 });
  });

  test('splits the body from the frontmatter block', () => {
    // Arrange
    const text = '---\nname: x\n---\nbody line\nlast\n';
    // Act
    const result = countText(text);
    // Assert
    assert.equal(result.lines, 5);
    assert.equal(result.bodyLines, 2);
    assert.equal(result.bodyChars, 'body line\nlast\n'.length);
  });

  test('treats empty and undefined input as zero', () => {
    // Act
    const results = [countText('').lines, countText(undefined).words];
    // Assert
    assert.deepEqual(results, [0, 0]);
  });

  test('counts a code point as one char', () => {
    // Act
    const result = countText('→→');
    // Assert
    assert.equal(result.chars, 2);
  });
});

describe('mean', () => {
  test('averages to one decimal', () => {
    // Act
    const results = [mean(['4', '5', '3']), mean(['4', '5'])];
    // Assert
    assert.deepEqual(results, [4, 4.5]);
  });

  test('returns null for an empty list or a non-number', () => {
    // Act
    const results = [mean([]), mean(['4', 'x']), mean(['1; ls'])];
    // Assert
    assert.deepEqual(results, [null, null, null]);
  });
});

describe('main', () => {
  const run = (argv, text = 'a b\n') => {
    const logs = [];
    const errors = [];
    const code = main(argv, {
      readFile: () => text,
      log: (t) => logs.push(t),
      error: (t) => errors.push(t)
    });
    return { code, logs, errors };
  };

  test('prints counts for a safe path', () => {
    // Act
    const { code, logs } = run(['/a/x.md']);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(logs[0]), { ok: true, lines: 1, chars: 4, words: 2, bodyLines: 1, bodyChars: 4 });
  });

  test('prints a mean', () => {
    // Act
    const { code, logs } = run(['--mean', '5', '4']);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(logs[0]), { ok: true, mean: 4.5 });
  });

  test('exits 2 on an unsafe path, extra args, or a bad mean', () => {
    // Act
    const results = [run(['/a/../b']), run(['/a', '/b']), run(['--mean']), run(['--mean', 'x'])];
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2, 2, 2]
    );
    assert.equal(results[0].logs.length, 0);
  });
});
