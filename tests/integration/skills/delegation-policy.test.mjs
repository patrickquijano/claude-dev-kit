import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['audit-skill', 'audit-subagent', 'build-subagent', 'review-code-changes'];
const skillFile = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');

describe('write delegation policy across audit and build skills', () => {
  for (const skill of skills) {
    test(`${skill} never names rubric-improver or task-worker`, () => {
      // Arrange
      const dir = join(root, 'skills', skill);
      const files = ['SKILL.md', ...readdirSync(join(dir, 'references')).map((f) => join('references', f))];
      // Act
      const offenders = files.filter((f) => /rubric-improver|task-worker/.test(readFileSync(join(dir, f), 'utf8')));
      // Assert
      assert.deepEqual(offenders, []);
    });

    test(`${skill} names implement-spec and no planner or implementer`, () => {
      // Arrange
      const dir = join(root, 'skills', skill);
      const files = ['SKILL.md', ...readdirSync(join(dir, 'references')).map((f) => join('references', f))];
      // Act
      const invokes = skillFile(skill).includes('cdk:implement-spec');
      const offenders = files.filter((f) =>
        /cdk:implementation-planner|cdk:plan-implementer/.test(readFileSync(join(dir, f), 'utf8'))
      );
      // Assert
      assert.ok(invokes, 'implement-spec not named');
      assert.deepEqual(offenders, []);
    });
  }
});

describe('task-worker is removed', () => {
  test('agent file is gone', () => {
    // Arrange
    const path = join(root, 'agents', 'task-worker.md');
    // Act
    const exists = existsSync(path);
    // Assert
    assert.equal(exists, false);
  });
});
