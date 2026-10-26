import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, titleErrors } from '../../../../../skills/open-github-pull-request/scripts/check-title.mjs';

describe('titleErrors', () => {
  test('accepts typed titles with and without scope or breaking mark', () => {
    // Arrange
    const titles = ['feat(skills): add pr skill', 'fix: handle empty diff', 'refactor(hooks)!: drop legacy entry'];
    // Act
    const result = titles.map(titleErrors);
    // Assert
    assert.deepEqual(result, [[], [], []]);
  });

  test('accepts a title of exactly 72 chars', () => {
    // Arrange
    const title = `feat: ${'a'.repeat(66)}`;
    // Act
    const result = titleErrors(title);
    // Assert
    assert.deepEqual(result, []);
  });

  test('rejects an unknown type, a missing type, and a missing description', () => {
    // Arrange
    const titles = ['wip: add thing', 'add thing', 'feat:'];
    // Act
    const result = titles.map((t) => titleErrors(t).length > 0);
    // Assert
    assert.deepEqual(result, [true, true, true]);
  });

  test('rejects an uppercase start and a trailing period', () => {
    // Arrange
    const titles = ['feat: Add pr skill', 'feat: add pr skill.'];
    // Act
    const result = titles.map(titleErrors);
    // Assert
    assert.deepEqual(result, [['description must start lowercase'], ['description must not end with a period']]);
  });

  test('rejects a title over 72 chars', () => {
    // Arrange
    const title = `feat: ${'a'.repeat(67)}`;
    // Act
    const result = titleErrors(title);
    // Assert
    assert.deepEqual(result, ['longer than 72 chars (73)']);
  });
});

describe('titleErrors metacharacters', () => {
  test('rejects quote, newline, dollar, semicolon, and backtick', () => {
    // Arrange
    const titles = ["fix: it's bad", 'fix: a\nb', 'fix: use $HOME', 'fix: a; b', 'fix: run `x`'];
    // Act
    const result = titles.map((t) => titleErrors(t).includes('contains control characters or shell metacharacters'));
    // Assert
    assert.deepEqual(result, [true, true, true, true, true]);
  });

  test('accepts dash, slash, and dot in the description', () => {
    // Arrange
    const title = 'fix(skills): handle a-b/c.d paths';
    // Act
    const result = titleErrors(title);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('main', () => {
  test('prints ok and returns 0 for a valid title from stdin', () => {
    // Arrange
    const out = [];
    // Act
    const code = main([], { readStdin: () => 'feat(skills): add pr skill', log: (t) => out.push(t) });
    // Assert
    assert.deepEqual([code, out], [0, ['{"ok":true}']]);
  });

  test('strips one trailing newline', () => {
    // Arrange
    const out = [];
    // Act
    const code = main([], { readStdin: () => 'feat: ok\n', log: (t) => out.push(t) });
    // Assert
    assert.deepEqual([code, out], [0, ['{"ok":true}']]);
  });

  test('prints errors and returns 1 for an invalid title', () => {
    // Arrange
    const out = [];
    // Act
    const code = main([], { readStdin: () => 'Feat: nope.', log: (t) => out.push(t) });
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out[0]).ok, false);
  });

  test('prints usage and returns 2 for empty input', () => {
    // Arrange
    const err = [];
    // Act
    const code = main([], { readStdin: () => '\n', error: (t) => err.push(t) });
    // Assert
    assert.deepEqual([code, err.length], [2, 1]);
  });

  test('prints usage and returns 2 for an argv title', () => {
    // Arrange
    const err = [];
    // Act
    const code = main(['feat: ok'], { readStdin: () => 'feat: ok', error: (t) => err.push(t) });
    // Assert
    assert.deepEqual([code, err.length], [2, 1]);
  });
});
