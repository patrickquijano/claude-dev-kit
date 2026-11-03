import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['address-github-pull-request-review', 'address-gitlab-merge-request-review'];
const read = (skill, file) => readFileSync(join(root, 'skills', skill, file), 'utf8');
const section = (text, heading) => {
  const start = text.indexOf(`## ${heading}\n`);
  if (start < 0) return '';
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next < 0 ? undefined : next);
};

describe('address skills delegate planning and edits', () => {
  for (const skill of skills) {
    test(`${skill} SKILL.md names the planner and the implementer`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      // Act
      const named = ['cdk:implementation-planner', 'cdk:plan-implementer'].filter((n) => text.includes(n));
      // Assert
      assert.equal(named.length, 2);
    });

    test(`${skill} flow.md Plan names the planner`, () => {
      // Arrange
      const plan = section(read(skill, 'references/flow.md'), 'Plan');
      // Act
      const named = plan.includes('cdk:implementation-planner');
      // Assert
      assert.ok(named, 'planner not named in Plan');
    });

    test(`${skill} flow.md Implement names the implementer and says never commit`, () => {
      // Arrange
      const implement = section(read(skill, 'references/flow.md'), 'Implement');
      // Act
      const named = implement.includes('cdk:plan-implementer');
      const noCommit = /never commit/.test(implement);
      // Assert
      assert.ok(named && noCommit, 'implementer or never-commits missing');
    });

    test(`${skill} never names task-worker or rubric-improver`, () => {
      // Arrange
      const dir = join(root, 'skills', skill);
      const files = ['SKILL.md', ...readdirSync(join(dir, 'references')).map((f) => join('references', f))];
      // Act
      const offenders = files.filter((f) => /task-worker|rubric-improver/.test(readFileSync(join(dir, f), 'utf8')));
      // Assert
      assert.deepEqual(offenders, []);
    });

    test(`${skill} flow.md Push guards a dirty tracked tree before the rebase`, () => {
      // Arrange
      const push = section(read(skill, 'references/flow.md'), 'Push');
      // Act
      const guard = push.indexOf('--untracked-files=no');
      const rebase = push.indexOf('run `pull-rebase`');
      // Assert
      assert.ok(guard >= 0 && guard < rebase, 'guard missing or after pull-rebase');
    });
  }
});

describe('address-github-pull-request-review failing checks', () => {
  test('flow.md Identify names check-log and commands.md defines it', () => {
    // Arrange
    const skill = skills[0];
    const identify = section(read(skill, 'references/flow.md'), 'Identify');
    const commands = read(skill, 'references/commands.md');
    // Act
    const named = identify.includes('`check-log`');
    const defined = /^\| `check-log`\s*\|/m.test(commands);
    // Assert
    assert.ok(named && defined, 'check-log missing from Identify or commands.md');
  });
});

describe('address-gitlab-merge-request-review changed files', () => {
  test('flow.md Identify names mr-files and commands.md defines it', () => {
    // Arrange
    const skill = skills[1];
    const identify = section(read(skill, 'references/flow.md'), 'Identify');
    const commands = read(skill, 'references/commands.md');
    // Act
    const named = identify.includes('`mr-files`');
    const defined = /^\| `mr-files`\s*\|/m.test(commands);
    // Assert
    assert.ok(named && defined, 'mr-files missing from Identify or commands.md');
  });
});
