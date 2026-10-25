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

describe('main', () => {
  test('prints ok and returns 0 for a valid title', () => {
    // Arrange
    const out = [];
    // Act
    const code = main(['feat(skills): add pr skill'], { log: (t) => out.push(t) });
    // Assert
    assert.deepEqual([code, out], [0, ['{"ok":true}']]);
  });

  test('prints errors and returns 1 for an invalid title', () => {
    // Arrange
    const out = [];
    // Act
    const code = main(['Feat: nope.'], { log: (t) => out.push(t) });
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out[0]).ok, false);
  });

  test('prints usage and returns 2 without an argument', () => {
    // Arrange
    const err = [];
    // Act
    const code = main([], { error: (t) => err.push(t) });
    // Assert
    assert.deepEqual([code, err.length], [2, 1]);
  });
});
