import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');

const filesUnder = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]
  );

const skillText = (name) =>
  filesUnder(join(skillsDir, name))
    .filter((file) => file.endsWith('.md') && !file.endsWith(join('references', 'evals.md')))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

// Each entry is a fact stop that refuses without asking; `--yes` never skips it.
const STOPS = {
  'audit-code-security': [/not ignored by git/, /never .*--yes/],
  'merge-github-pull-request': [
    /draft/i,
    /conflict/i,
    /head.*(changed|moved)/i,
    /Bypass eligibility/,
    /--match-head-commit|expectedHeadSha/
  ],
  'merge-gitlab-merge-request': [/draft/i, /conflict/i, /head.*(changed|moved)/i, /Bypass eligibility/],
  'rebase-onto': [/--force-with-lease=<branch>:<[^>]+>/, /--force-if-includes/],
  'setup-husky': [/foreign|another tool/i, /core\.hooksPath/],
  'push-commits': [/unsigned/i],
  'upgrade-dependencies': [/dirty|uncommitted/i],
  'build-skill': [/cdk:audit-skill/]
};

describe('safety stops are kept', () => {
  for (const [name, patterns] of Object.entries(STOPS)) {
    for (const pattern of patterns) {
      test(`${name} keeps ${pattern}`, () => {
        // Arrange
        const text = skillText(name);
        // Act
        const found = pattern.test(text);
        // Assert
        assert.ok(found, `${name} lost its stop: ${pattern}`);
      });
    }
  }

  for (const name of ['audit-skill', 'audit-subagent', 'build-skill', 'build-subagent']) {
    test(`${name} has no --owned flag and no dirty tracked file stop`, () => {
      // Arrange
      const text = skillText(name);
      // Act
      const found = /--owned|dirty tracked file/.test(text);
      // Assert
      assert.equal(found, false);
    });
  }

  test('delete-branches never force-deletes', () => {
    // Arrange
    const text = filesUnder(join(skillsDir, 'delete-branches'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    // Act
    const forces = /force-delete|branch -D|-D\b/.test(text);
    // Assert
    assert.equal(forces, false);
  });
});
