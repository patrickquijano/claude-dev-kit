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

const readRel = (rel) => readFileSync(join(root, rel), 'utf8');

describe('update-readme and update-rules brief a write scope and a fixed approach', () => {
  test('update-readme SKILL.md names the write scope and the fixed approach', () => {
    // Arrange
    const text = skillMd('update-readme');
    // Act
    const rule =
      /^- Every write in steps 11, 12 \(verify fix\), and 15 .*Write scope: the README set.*Approach: fixed to each goal's Before → After/m;
    // Assert
    assert.match(text, rule);
  });

  test('update-readme flow.md improve round names the write scope', () => {
    // Arrange
    const text = readRel('skills/update-readme/references/flow.md');
    // Act
    const rule = /^Build the Spec brief .*Write scope: the README set.*Approach: fixed to each goal's Before → After/m;
    // Assert
    assert.match(text, rule);
  });

  test('update-rules SKILL.md names the write scope and the step 8c goal', () => {
    // Arrange
    const text = skillMd('update-rules');
    // Act
    const scope =
      /^- Every write in step 5 and step 8 .*`Write scope:`.*`Approach: fixed to each goal's Before → After`/m;
    const goal = /step 8c improve-round goal/;
    // Assert
    assert.match(text, scope);
    assert.match(text, goal);
  });

  test('update-rules SKILL.md has no step 8 plan', () => {
    // Arrange
    const text = skillMd('update-rules');
    // Act
    const stale = /step 8 plan/.test(text);
    // Assert
    assert.equal(stale, false);
  });

  test('update-rules flow.md names the write scope and the unmet-goal rule', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/flow.md');
    // Act
    const scope =
      /^- Spec: .*`Write scope:` the files the goals name; `Approach: fixed to each goal's Before → After`/m;
    const unmet =
      /^- Apply: .*An unmet goal \(its `Goals:` line\) or a `Files:` path outside the write scope → `Open:`/m;
    // Assert
    assert.match(text, scope);
    assert.match(text, unmet);
  });

  test('update-rules flow.md no longer keys on Status: partial', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/flow.md');
    // Act
    const stale = /Status: partial/.test(text);
    // Assert
    assert.equal(stale, false);
  });

  test('update-rules evals.md describes the extend ask, not a hard cap', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/evals.md');
    // Act
    const stale = /At most 3 improve rounds/.test(text);
    const extend = /3 more per Extend/.test(text);
    // Assert
    assert.equal(stale, false);
    assert.ok(extend, 'extend wording missing');
  });
});

describe('audit skills keep --score-only out of the write path', () => {
  for (const skill of ['audit-skill', 'audit-subagent']) {
    test(`${skill} --score-only runs steps 1–4 then 10 and never edits`, () => {
      // Arrange
      const text = skillMd(skill);
      // Act
      const rule = /^- `--score-only` runs steps 1–4 and then 10, never edits/m;
      const decide = /^\d+\. \*\*Decide\.\*\* `--score-only` → go to step 10\./m;
      const stale = /^- `--score-only`[^\n]*(step 6|implement-spec)/m;
      // Assert
      assert.match(text, rule);
      assert.match(text, decide);
      assert.doesNotMatch(text, stale);
    });
  }
});

describe('implement-spec resolves Root from the caller first', () => {
  test('the caller-passed target directory wins over the git top-level', () => {
    // Arrange
    const text = skillMd('implement-spec');
    // Act
    const first =
      /^1\. \*\*Root\.\*\* Resolve Root: the caller-passed target directory, else the git top-level, else the working directory;/m;
    const stale = /Resolve Root: the git top-level/;
    // Assert
    assert.match(text, first);
    assert.doesNotMatch(text, stale);
  });

  test('evals.md has the target-dir case', () => {
    // Arrange
    const text = readRel('skills/implement-spec/references/evals.md');
    // Act
    const row = /^\| target-dir +\|.*not the git top-level/m;
    // Assert
    assert.match(text, row);
  });
});

describe('implement-spec stops are split into input stops and cap stops', () => {
  for (const skill of ['update-readme', 'update-rules']) {
    test(`${skill} SKILL.md treats other stops as cap stops`, () => {
      // Arrange
      const text = skillMd(skill);
      // Act
      const cap = /any other `Stopped:` is a cap stop/.test(text);
      const stale = /Its `Stopped:` becomes/.test(text);
      // Assert
      assert.ok(cap, 'cap-stop rule missing');
      assert.equal(stale, false);
    });

    test(`${skill} flow.md lists the extend question as a cancel`, () => {
      // Arrange
      const text = readRel(`skills/${skill}/references/flow.md`);
      // Act
      const rule = /^The user dismisses.*the `Extend 3 more rounds \| Stop` question/m;
      // Assert
      assert.match(text, rule);
    });
  }

  test('update-readme SKILL.md stops at the cap on Stop or --yes', () => {
    // Arrange
    const text = skillMd('update-readme');
    // Act
    const rule =
      /^ {4}At the cap with open items, ask the extend question \(Rules\): .*Stop or `--yes` → `Result: stopped`/m;
    // Assert
    assert.match(text, rule);
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
