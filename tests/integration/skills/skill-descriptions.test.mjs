import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cases = [
  {
    path: ['skills', 'address-github-pull-request-review', 'SKILL.md'],
    term: 'address PR feedback'
  },
  {
    path: ['skills', 'address-gitlab-merge-request-review', 'SKILL.md'],
    term: 'address MR feedback'
  },
  {
    path: ['.claude', 'skills', 'release-plugin', 'SKILL.md'],
    term: 'cut a release'
  }
];

const readDescription = (path) => {
  const text = readFileSync(join(root, ...path), 'utf8');
  const match = text.match(/^description: (.*)$/m);
  return match ? match[1].replace(/^(['"])(.*)\1$/, '$2') : '';
};

describe('skill descriptions stay short and standalone', () => {
  for (const { path, term } of cases) {
    const name = path.slice(0, -1).join('/');

    test(`${name} description is at most 200 chars`, () => {
      // Arrange
      const description = readDescription(path);
      // Act
      const length = description.length;
      // Assert
      assert.ok(length > 0, 'description not found');
      assert.ok(length <= 200, `description is ${length} chars`);
    });

    test(`${name} description names no other skill`, () => {
      // Arrange
      const description = readDescription(path);
      // Act
      const references = /cdk:|\/cdk/.test(description);
      const named = readdirSync(join(root, 'skills')).filter((dir) => dir !== path.at(-2) && description.includes(dir));
      // Assert
      assert.ok(description.length > 0, 'description not found');
      assert.equal(references, false);
      assert.deepEqual(named, []);
    });

    test(`${name} description keeps the trigger term "${term}"`, () => {
      // Arrange
      const description = readDescription(path);
      // Act
      const hasTerm = description.includes(term);
      // Assert
      assert.ok(hasTerm);
    });
  }
});
