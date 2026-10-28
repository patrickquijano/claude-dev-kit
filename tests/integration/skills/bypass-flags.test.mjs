import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
// Skills with no plan mode take `--yes` only.
const NO_PLAN_MODE = new Set([
  'create-git-tag',
  'draft-prompt',
  'merge-github-pull-request',
  'merge-gitlab-merge-request',
  'push-commits',
  'push-tags',
  'switch-branch'
]);

const hintOf = (content) => content.match(/^argument-hint:\s*(.*)$/m)?.[1] ?? '';

describe('bypass flags', () => {
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    const content = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    test(`${name} argument-hint has --yes`, () => {
      // Arrange
      const hint = hintOf(content);
      // Act
      const hasYes = hint.includes('--yes');
      // Assert
      assert.ok(hasYes, `argument-hint: ${hint}`);
    });

    test(`${name} argument-hint has --no-plan when it has a plan mode`, () => {
      // Arrange
      const hint = hintOf(content);
      const expected = !NO_PLAN_MODE.has(name);
      // Act
      const hasNoPlan = hint.includes('--no-plan');
      // Assert
      assert.equal(hasNoPlan, expected, `argument-hint: ${hint}`);
    });

    test(`${name} body implements --yes`, () => {
      // Arrange
      const text = body;
      // Act
      const mentionsYes = text.includes('`--yes`');
      // Assert
      assert.ok(mentionsYes, 'body never mentions `--yes`');
    });

    test(`${name} body implements --no-plan when it has a plan mode`, () => {
      // Arrange
      const expected = !NO_PLAN_MODE.has(name);
      // Act
      const mentionsNoPlan = body.includes('`--no-plan`');
      // Assert
      assert.equal(mentionsNoPlan, expected);
    });
  }
});
