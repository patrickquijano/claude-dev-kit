import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
const SWITCHER = 'switch-branch';
const COMMITTER = 'commit-changes';
const REBASE_EXEMPT = new Set(['rebase-onto']);

// A backticked `git switch`, or `git checkout` not followed by --ours, --theirs, or --; "Never `git ...`" is a prohibition.
const BRANCH_SWITCH = /(?<!Never )`git (?:switch|checkout(?! --ours| --theirs| --))/;
// A backticked `git commit` not followed by `-` (commit-tree).
const COMMIT = /(?<!Never )`git commit(?!-)/;

const filesOf = (name) => {
  const dir = join(skillsDir, name);
  const refsDir = join(dir, 'references');
  const refs = existsSync(refsDir)
    ? readdirSync(refsDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => join(refsDir, file))
    : [];
  return [join(dir, 'SKILL.md'), ...refs];
};

describe('git ownership', () => {
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    if (REBASE_EXEMPT.has(name)) continue;
    const files = filesOf(name);

    if (name !== SWITCHER) {
      test(`${name} never switches a branch`, () => {
        // Arrange
        const hits = [];
        // Act
        for (const file of files) {
          if (BRANCH_SWITCH.test(readFileSync(file, 'utf8'))) hits.push(file);
        }
        // Assert
        assert.deepEqual(hits, []);
      });
    }

    if (name !== COMMITTER) {
      test(`${name} never commits`, () => {
        // Arrange
        const hits = [];
        // Act
        for (const file of files) {
          if (COMMIT.test(readFileSync(file, 'utf8'))) hits.push(file);
        }
        // Assert
        assert.deepEqual(hits, []);
      });
    }
  }
});
