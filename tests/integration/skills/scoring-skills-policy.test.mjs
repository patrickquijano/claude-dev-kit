import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skills = ['audit-skill', 'audit-subagent', 'build-skill', 'build-subagent', 'update-rules', 'update-readme'];
const rubrics = ['audit-skill', 'audit-subagent', 'update-rules', 'update-readme', 'build-subagent'].map(
  (s) => `skills/${s}/references/rubric.md`
);

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = (skill) => walk(join(root, 'skills', skill)).filter((p) => p.endsWith('.md'));
const skillMd = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');

describe('scoring skills share one policy', () => {
  for (const skill of skills) {
    describe(skill, () => {
      test('writes through implement-spec and names no planner or implementer', () => {
        // Arrange
        const text = skillMd(skill);
        // Act
        const invokes = text.includes('cdk:implement-spec');
        const spawns = files(skill).some((p) =>
          /implementation-planner|plan-implementer|rubric-improver/.test(readFileSync(p, 'utf8'))
        );
        // Assert
        assert.ok(invokes, 'implement-spec not invoked');
        assert.equal(spawns, false);
      });

      test('asks to extend at the round cap', () => {
        // Arrange
        const text = skillMd(skill);
        // Act
        const ask = text.includes('Extend 3 more rounds | Stop');
        // Assert
        assert.ok(ask);
      });

      test('prints Waived and Open in the Output', () => {
        // Arrange
        const text = skillMd(skill);
        const start = text.indexOf('## Output');
        const next = text.indexOf('\n## ', start + 1);
        const output = text.slice(start, next === -1 ? undefined : next);
        // Act
        const waived = output.includes('Waived:');
        const open = output.includes('Open:');
        // Assert
        assert.notEqual(start, -1, '## Output missing');
        assert.ok(waived, 'Waived: missing');
        assert.ok(open, 'Open: missing');
      });

      test('keeps fix memory in auto memory only', () => {
        // Arrange
        const text = skillMd(skill);
        // Act
        const rule = text.includes('Claude auto memory');
        const kind = text.includes('cdk-fix-');
        const guard = text.includes('never write under `${CLAUDE_SKILL_DIR}`');
        // Assert
        assert.ok(rule, 'auto-memory rule missing');
        assert.ok(kind, 'cdk-fix- name missing');
        assert.ok(guard, 'skill-dir write guard missing');
      });

      test('runs no formatter or linter', () => {
        // Arrange
        const forbidden = /format-files|format-readme|lint-readme|prettier|markdownlint/;
        // Act
        const hits = files(skill).filter((p) => forbidden.test(readFileSync(p, 'utf8')));
        // Assert
        assert.deepEqual(hits, []);
      });
    });
  }
});

describe('implement-spec runs outside git and runs no lint', () => {
  test('has no not-a-git-repository stop', () => {
    // Arrange
    const text = skillMd('implement-spec');
    // Act
    const stop = /not a git repository/.test(text);
    const noStop = text.includes('there is no stop for a missing repo');
    // Assert
    assert.equal(stop, false);
    assert.ok(noStop, 'no-stop statement missing');
  });

  test('verifier runs no format check or lint', () => {
    // Arrange
    const text = skillMd('implement-spec');
    // Act
    const lint = /then format check, lint/.test(text);
    const never = text.includes('never a formatter or linter');
    // Assert
    assert.equal(lint, false);
    assert.ok(never, 'never-formatter-or-linter statement missing');
  });
});

describe('rubrics waive negligible items', () => {
  for (const rel of [...rubrics, 'agents/rubric-scorer.md']) {
    test(`${rel} has the waiver rule`, () => {
      // Arrange
      const text = readFileSync(join(root, rel), 'utf8');
      // Act
      const rule = /Waived:/.test(text) && /negligible/i.test(text);
      // Assert
      assert.ok(rule);
    });
  }

  test('update-readme rubric still sums to 100', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills/update-readme/references/rubric.md'), 'utf8');
    const rows = [...text.matchAll(/^\| [A-Z]\d\s+\|.*\|\s*(\d+)\s*\|\s*$/gm)];
    // Act
    const total = rows.reduce((sum, m) => sum + Number(m[1]), 0);
    // Assert
    assert.equal(total, 100);
  });
});

describe('rubric-improver is removed', () => {
  test('agent file is gone', () => {
    // Arrange
    const path = join(root, 'agents', 'rubric-improver.md');
    // Act
    const exists = existsSync(path);
    // Assert
    assert.equal(exists, false);
  });
});
