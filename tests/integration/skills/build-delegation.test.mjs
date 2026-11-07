import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['build-skill', 'build-subagent'];

describe('build skills delegate writes to implement-spec', () => {
  for (const skill of skills) {
    const dir = join(root, 'skills', skill);
    const read = (rel) => readFileSync(join(dir, rel), 'utf8');

    test(`${skill} writes through implement-spec and names no planner or implementer`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const invokes = text.includes('cdk:implement-spec');
      const spawns = /implementation-planner|plan-implementer/.test(text);
      // Assert
      assert.ok(invokes, 'implement-spec not named');
      assert.equal(spawns, false);
    });

    test(`${skill} links references/briefs.md`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const linked = text.includes('references/briefs.md');
      // Assert
      assert.ok(linked);
    });

    test(`${skill} briefs.md has the Spec brief and the fix-round variant`, () => {
      // Arrange
      const path = join(dir, 'references', 'briefs.md');
      // Act
      const exists = existsSync(path);
      const text = exists ? readFileSync(path, 'utf8') : '';
      // Assert
      assert.ok(exists, 'briefs.md missing');
      assert.match(text, /^## Spec brief$/m);
      assert.match(text, /^## Fix-round variant$/m);
    });

    test(`${skill} applies only VERIFIED fixes from the audit`, () => {
      // Arrange
      const text = read('SKILL.md');
      // Act
      const rule =
        /^ +[bd]\. Not ACCEPTED, or VERIFIED fixes remain .*goals are only the VERIFIED fixes.*UNVERIFIED items go to `Open:`/m;
      // Assert
      assert.match(text, rule);
    });

    test(`${skill} briefs.md audit line takes only VERIFIED fixes`, () => {
      // Arrange
      const text = read(join('references', 'briefs.md'));
      // Act
      const rule =
        /^- audit: only the VERIFIED fixes from `audit-(skill|subagent) --score-only`.*UNVERIFIED items go to `Open:`/m;
      const stale = /^- audit: the (fix IDs|open items) from/m;
      // Assert
      assert.match(text, rule);
      assert.doesNotMatch(text, stale);
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
