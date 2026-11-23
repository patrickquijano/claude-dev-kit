import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = [
  'build-hook',
  'build-github-action',
  'build-github-workflow',
  'build-gitlab-ci',
  'build-dockerfile',
  'build-docker-compose',
  'setup-devcontainer',
  'upgrade-dependencies'
];

const read = (skill, file) => readFileSync(join(root, 'skills', skill, file), 'utf8');

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)]
  );

// Counts lines starting with `Write scope:` that sit outside any fenced block.
const topLevelScopeLines = (text) => {
  let fence = null;
  let count = 0;
  for (const line of text.split('\n')) {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (match) {
      if (fence === null) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
    } else if (fence === null && line.startsWith('Write scope:')) {
      count += 1;
    }
  }
  return count;
};

describe('skills route their writes through implement-spec', () => {
  for (const skill of skills) {
    test(`${skill} names implement-spec and its briefs file`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      // Act
      const names = text.includes('cdk:implement-spec');
      const briefs = text.includes('references/briefs.md');
      // Assert
      assert.ok(names, 'cdk:implement-spec missing');
      assert.ok(briefs, 'references/briefs.md missing');
    });

    test(`${skill} briefs.md has both sections and one top-level Write scope`, () => {
      // Arrange
      const text = read(skill, 'references/briefs.md');
      // Act
      const scopes = topLevelScopeLines(text);
      // Assert
      assert.match(text, /^## Spec brief$/m);
      assert.match(text, /^## Fix-round variant$/m);
      assert.equal(scopes, 1);
    });

    test(`${skill} names neither the planner nor the implementer agent`, () => {
      // Arrange
      const files = listFiles(join(root, 'skills', skill));
      // Act
      const hits = files.filter((file) =>
        /cdk:implementation-planner|cdk:plan-implementer/.test(readFileSync(file, 'utf8'))
      );
      // Assert
      assert.deepEqual(hits, []);
    });
  }
});

describe('skill-specific delegation wording', () => {
  for (const skill of ['build-dockerfile', 'build-docker-compose']) {
    test(`${skill} drops the own-writes line`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      // Act
      const found = text.includes('Writes and AskUserQuestion happen here only');
      // Assert
      assert.equal(found, false);
    });
  }

  test('setup-devcontainer drops the own-writes line and names the .env exception', () => {
    // Arrange
    const text = read('setup-devcontainer', 'SKILL.md');
    // Act
    const old = text.includes('Only this skill asks the user (AskUserQuestion) and writes files');
    // Assert
    assert.equal(old, false);
    assert.match(text, /^- Every write in steps [^\n]*except `\.env`\.[^\n]*missing-`\.env` write/m);
  });

  test('build-docker-compose contains no dclint-fix', () => {
    // Arrange
    const files = listFiles(join(root, 'skills', 'build-docker-compose'));
    // Act
    const hits = files.filter((file) => readFileSync(file, 'utf8').includes('dclint-fix'));
    // Assert
    assert.deepEqual(hits, []);
  });

  test('upgrade-dependencies keeps its dirty-tree stop', () => {
    // Arrange
    const text = read('upgrade-dependencies', 'SKILL.md');
    // Act
    const found = /`dirty-tree` not empty → stop/.test(text);
    // Assert
    assert.ok(found, 'dirty-tree stop missing');
  });

  test('update-statusline does not name implement-spec', () => {
    // Arrange
    const path = join(root, 'skills', 'update-statusline', 'SKILL.md');
    // Act
    const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
    // Assert
    assert.ok(text.length > 0, 'SKILL.md missing');
    assert.equal(text.includes('cdk:implement-spec'), false);
  });
});
