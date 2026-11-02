import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['build-skill', 'build-subagent'];

describe('build skills delegate writes to planner then implementer', () => {
  for (const skill of skills) {
    const dir = join(root, 'skills', skill);
    const read = (rel) => readFileSync(join(dir, rel), 'utf8');

    test(`${skill} names the planner before the implementer`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const planner = text.indexOf('cdk:implementation-planner');
      const implementer = text.indexOf('cdk:plan-implementer');
      // Assert
      assert.ok(planner >= 0, 'planner not named');
      assert.ok(implementer >= 0, 'implementer not named');
      assert.ok(planner < implementer, 'planner must come first');
    });

    test(`${skill} links references/briefs.md`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const linked = text.includes('references/briefs.md');
      // Assert
      assert.ok(linked);
    });

    test(`${skill} briefs.md has both briefs`, () => {
      // Arrange
      const path = join(dir, 'references', 'briefs.md');
      // Act
      const exists = existsSync(path);
      const text = exists ? readFileSync(path, 'utf8') : '';
      // Assert
      assert.ok(exists, 'briefs.md missing');
      assert.match(text, /^## Planner brief$/m);
      assert.match(text, /^## Implementer brief$/m);
    });

    test(`${skill} no longer keeps fixes inline`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const stale = /fixes stay inline/i.test(text);
      // Assert
      assert.equal(stale, false);
    });

    test(`${skill} never spawns task-worker`, () => {
      // Arrange
      const files = ['SKILL.md', ...readdirSync(join(dir, 'references')).map((f) => join('references', f))];
      // Act
      const offenders = files.filter((f) => read(f).includes('task-worker'));
      // Assert
      assert.deepEqual(offenders, []);
    });
  }
});
