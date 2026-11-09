import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['review-github-pull-request', 'review-gitlab-merge-request'];
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const agent = read('agents', 'code-reviewer.md');
const kinds = ['intent', 'correctness', 'security', 'quality', 'sweep', 'threads'];
const subagent = 'cdk:code-reviewer';
// Each file listed must name the subagent; the evals file is checked for task-worker only.
const delegating = [
  { skill: 'review-github-pull-request', named: ['SKILL.md', 'references/analyze.md', 'references/threads.md'] },
  { skill: 'review-gitlab-merge-request', named: ['SKILL.md', 'references/analyze.md', 'references/threads.md'] },
  { skill: 'review-code-changes', named: ['SKILL.md', 'references/review.md'] }
];

describe('skills delegate to the code-reviewer subagent', () => {
  for (const { skill, named } of delegating) {
    for (const file of named) {
      test(`${skill} ${file} names ${subagent}`, () => {
        // Arrange
        const text = read('skills', skill, file);
        // Act
        const found = text.includes(subagent);
        // Assert
        assert.ok(found, `${subagent} not named`);
      });
    }

    test(`${skill} never names task-worker`, () => {
      // Arrange
      const pattern = /task-worker/;
      // Act
      const offenders = [...named, 'references/evals.md'].filter((f) => pattern.test(read('skills', skill, f)));
      // Assert
      assert.deepEqual(offenders, []);
    });
  }

  for (const skill of skills) {
    test(`${skill} analyze.md spawns every area kind`, () => {
      // Arrange
      const text = read('skills', skill, 'references', 'analyze.md');
      // Act
      const missing = kinds.filter((k) => k !== 'threads' && !text.includes(`\`${k}\``));
      // Assert
      assert.deepEqual(missing, []);
    });

    test(`${skill} threads.md spawns kind threads`, () => {
      // Arrange
      const text = read('skills', skill, 'references', 'threads.md');
      // Act
      const kind = text.includes('kind `threads`');
      // Assert
      assert.ok(kind, 'kind threads missing');
    });
  }

  test('code-reviewer tools exclude Edit and Write', () => {
    // Arrange
    const tools = /^tools:\s*(.+)$/m
      .exec(agent)[1]
      .split(',')
      .map((t) => t.trim());
    // Act
    const writers = tools.filter((t) => ['Edit', 'Write', 'NotebookEdit'].includes(t));
    // Assert
    assert.deepEqual(writers, []);
  });

  test('code-reviewer lists every kind', () => {
    // Arrange
    const section = agent.slice(agent.indexOf('## Kinds'), agent.indexOf('## Return'));
    // Act
    const missing = kinds.filter((k) => !section.includes(`### ${k}`));
    // Assert
    assert.deepEqual(missing, []);
  });
});
