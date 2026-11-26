import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
const read = (...parts) => readFileSync(join(skillsDir, ...parts), 'utf8');

describe('caller and agent seams', () => {
  for (const name of ['setup-nextjs-app', 'setup-dotnet-api', 'setup-laravel-api']) {
    test(`${name} sends kind: packages to the version resolver and parses Versions`, () => {
      // Arrange
      const text = read(name, 'references', 'research.md');
      // Act
      const sends = text.includes('`kind: packages`');
      const parses = text.includes('`Versions: <pkg: version (source)>');
      // Assert
      assert.ok(sends && parses);
    });
  }

  test('commit-changes sends mode=group to the change analyzer', () => {
    // Arrange
    const text = read('commit-changes', 'references', 'flow.md');
    // Act
    const found = text.includes('`mode=group branch=no`');
    // Assert
    assert.ok(found);
  });

  test('switch-branch sends mode=branch-name with base and input hints', () => {
    // Arrange
    const text = read('switch-branch', 'references', 'branch-name.md');
    // Act
    const found = /`mode=branch-name`, `base=<ref>\|none`, `input=<text>\|none`/.test(text);
    // Assert
    assert.ok(found);
  });

  for (const name of ['review-github-pull-request', 'review-gitlab-merge-request']) {
    test(`${name} treats an Accepted thread as open`, () => {
      // Arrange
      const text = read(name, 'references', 'threads.md');
      // Act
      const found = /judged Open or Accepted/.test(text);
      // Assert
      assert.ok(found);
    });

    test(`${name} handles an Accepted thread as still gating and counted under left open`, () => {
      // Arrange
      const text = read(name, 'references', 'threads.md');
      // Act
      const found = /never resolved, no reply, still gating, counted under `left open`, and listed under `Open:`/.test(
        text
      );
      // Assert
      assert.ok(found);
    });

    test(`${name} gates on a carried item judged Open or Accepted`, () => {
      // Arrange
      const text = read(name, 'references', 'threads.md');
      // Act
      const found = /no carried item is judged Open or Accepted/.test(text);
      // Assert
      assert.ok(found);
    });
  }

  test('both threads.md twins and the code-reviewer agent pin the same thread return template', () => {
    // Arrange
    const template = '<id> | <Fixed | Accepted | Obsolete | Open> | <path:line> | <reason>';
    const texts = [
      read('review-github-pull-request', 'references', 'threads.md'),
      read('review-gitlab-merge-request', 'references', 'threads.md'),
      readFileSync(join(skillsDir, '..', 'agents', 'code-reviewer.md'), 'utf8')
    ];
    // Act
    const found = texts.map((text) => text.includes(template));
    // Assert
    assert.deepEqual(found, [true, true, true]);
  });
});
