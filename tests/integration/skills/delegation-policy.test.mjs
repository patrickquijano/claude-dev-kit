import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['audit-skill', 'audit-subagent', 'build-skill', 'build-subagent'];
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

    test(`${skill} names the planner`, () => {
      // Arrange
      const text = skillFile(skill);
      // Act
      const planner = text.indexOf('cdk:implementation-planner');
      // Assert
      assert.ok(planner >= 0, 'planner not named');
    });

    test(`${skill} states the more-than-3-files rule with plan-implementer`, () => {
      // Arrange
      const text = skillFile(skill);
      // Act
      const rule = /more than 3 files[^\n]*cdk:plan-implementer|cdk:plan-implementer[^\n]*more than 3 files/i.test(
        text
      );
      // Assert
      assert.ok(rule, 'rule missing');
    });

    test(`${skill} names the planner before the implementer`, () => {
      // Arrange
      const text = skillFile(skill);
      // Act
      const planner = text.indexOf('cdk:implementation-planner');
      const implementer = text.indexOf('cdk:plan-implementer');
      // Assert
      assert.ok(planner < implementer, 'planner must come first');
    });
  }

  test('rubric-improver has no audit kinds', () => {
    // Arrange
    const text = readFileSync(join(root, 'agents', 'rubric-improver.md'), 'utf8');
    // Act
    const stale = /skill-audit|subagent-audit/.test(text);
    // Assert
    assert.equal(stale, false);
  });
});
