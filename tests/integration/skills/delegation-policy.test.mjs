import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['audit-skill', 'build-skill', 'audit-subagent', 'build-subagent', 'review-code-changes'];
const skillFile = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');

describe('write delegation policy across audit, build, and review skills', () => {
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
  }

  // scoring-skills-policy covers the other four skills; review-code-changes is only checked here.
  test('review-code-changes names implement-spec and no planner or implementer', () => {
    // Arrange
    const skill = 'review-code-changes';
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
});

describe('README agent rows list each kind or mode', () => {
  test('each agent that declares kind or mode has the same tokens in its README row', () => {
    // Arrange
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    const names = [];
    const declared = {};
    for (const file of readdirSync(join(root, 'agents')).filter((f) => f.endsWith('.md'))) {
      const step = readFileSync(join(root, 'agents', file), 'utf8').match(/^1\. .*$/m);
      const group = step ? step[0].match(/`(?:kind|mode)` \(([^)]*)\)/) : null;
      if (!group) continue;
      const name = file.slice(0, -'.md'.length);
      names.push(name);
      declared[name] = [...group[1].matchAll(/`([a-z-]+)`/g)].map((m) => m[1]).sort();
    }
    // Act
    const offenders = names.filter((name) => {
      const line = readme.split('\n').find((l) => l.startsWith(`| \`cdk:${name}\` `));
      const cell = line ? line.split('|')[2] : '';
      const listed = new Set();
      for (const g of cell.matchAll(/\(([^()]*)\)/g)) {
        for (const t of g[1].matchAll(/`([a-z-]+)`/g)) listed.add(t[1]);
      }
      return JSON.stringify([...listed].sort()) !== JSON.stringify([...new Set(declared[name])].sort());
    });
    // Assert
    // 10 agents declare kind or mode today; this stops a vacuous pass.
    assert.ok(names.length >= 10, `only ${names.length} agents declare kind or mode`);
    assert.deepEqual(offenders, []);
  });
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
