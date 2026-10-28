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
  for (const name of readdirSync(skillsDir).sort()) {
    const content = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');

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
  }
});
