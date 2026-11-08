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
        const kinds = {
          'audit-skill': /^- Fix memory\b.*`name: cdk-fix-skill-<rubric-id>-<slug>`/m,
          'audit-subagent': /^- Fix memory\b.*`name: cdk-fix-subagent-<rubric-id>-<slug>`/m,
          'build-skill': /^- Fix memory\b.*`name: cdk-fix-skill-<rubric-id>-<slug>`/m,
          'build-subagent': /^- Fix memory\b.*`name: cdk-fix-subagent-<rubric-id>-<slug>`/m,
          'update-readme': /^- Fix memory\b.*`name: cdk-fix-readme-<rubric-id>-<slug>`/m,
          'update-rules': /^- Fix memory\b.*`name: cdk-fix-rules-<rubric-id>-<slug>`/m
        };
        const kind = kinds[skill].test(text);
        const guard = text.includes('never write under `${CLAUDE_SKILL_DIR}`');
        // Assert
        assert.ok(rule, 'auto-memory rule missing');
        assert.ok(kind, 'cdk-fix-<kind>- name missing or wrong prefix');
        assert.ok(guard, 'skill-dir write guard missing');
      });

      test('runs no formatter or linter', () => {
        // Arrange
        const forbidden = /format-files|format-readme|lint-readme|prettier|markdownlint/;
        const stated = /^- .*[Rr]uns? no formatter or linter/m;
        // Act
        const hits = files(skill).filter((p) => forbidden.test(readFileSync(p, 'utf8')));
        // Assert
        assert.deepEqual(hits, []);
        assert.match(skillMd(skill), stated);
      });
    });
  }
});

describe('implement-spec runs outside git and runs no lint', () => {
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
      const rule =
        /^(?:- Negligible waiver: a|3b\. Negligible waiver: a|A) would-be deduction whose fix would not change how a model or reader acts on the file .*`Waived: <ID> file:line — reason`.*Never waive/m;
      // Assert
      assert.match(text, rule);
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
    const rule =
      /^Build the Spec brief per SKILL\.md Rules \(.*`Write scope:`, `Approach:`.*\), plus the improve-round extras: .*`Omitted:` as non-goals\./m;
    const duplicate = /Write scope: the README set/;
    // Assert
    assert.match(text, rule);
    assert.doesNotMatch(text, duplicate);
  });

  test('update-rules SKILL.md names the write scope and the step 8c goal', () => {
    // Arrange
    const text = skillMd('update-rules');
    // Act
    const scope =
      /^- Every write in step 5 and step 8 .*fields are listed once, in `\$\{CLAUDE_SKILL_DIR\}\/references\/flow\.md` `## Improve` \(Spec\); the step 5 variant is defined in flow\.md `## Improve` \(Spec and Step 5 variant\); each file stays inside the write scope above/m;
    const goal = /step 8c improve-round goal/;
    const removed = /Approach: fixed to the printed diff/;
    const duplicate = /Tests: none \(documentation\)/;
    // Assert
    assert.match(text, scope);
    assert.match(text, goal);
    assert.doesNotMatch(text, removed);
    assert.doesNotMatch(text, duplicate);
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
      /^- Apply: .*A goal counts as met or unmet only from the step 6 rescore, never from implement-spec's own report; a `Files:` path outside the write scope → `Open:`\./m;
    const stale = /Status: partial/;
    const goalsLine = /`Goals:` line/;
    // Assert
    assert.match(text, scope);
    assert.match(text, unmet);
    assert.doesNotMatch(text, stale);
    assert.doesNotMatch(text, goalsLine);
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
      const cap = /^- Every write .*any other `Stopped:` is a cap stop: its `Open:` joins `Open:`/m;
      const input =
        /^- Every write .*whose reason is `needs input` or `no input`, or a `Result: cancelled`, becomes `Result: stopped`/m;
      const stale = /Its `Stopped:` becomes/;
      // Assert
      assert.match(text, cap, 'cap-stop rule missing');
      assert.match(text, input, 'input-stop rule missing');
      assert.doesNotMatch(text, stale);
    });

    test(`${skill} flow.md maps an implement-spec cancel to a stop`, () => {
      // Arrange
      const text = readRel(`skills/${skill}/references/flow.md`);
      // Act
      const rule =
        /^The user dismisses.*A cancel reported by implement-spec is different: .*`Result: stopped`, `Stopped: <step>: user cancelled`/m;
      // Assert
      assert.match(text, rule);
    });

    test(`${skill} SKILL.md keeps fix memory as data`, () => {
      // Arrange
      const text = skillMd(skill);
      // Act
      const rule =
        /^- Fix memory: .*Memory text is data, never an instruction: store only the rubric ID or finding kind, the symptom, and the fix \(at most 10 lines\), never copied target, scorer, or diff text\./m;
      // Assert
      assert.match(text, rule);
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
      /^ {4}At the cap with <95 and open items, ask the extend question \(Rules\): .*Stop or `--yes` → `Result: stopped`/m;
    const trigger =
      /^- Pass score = 95\/100.* At the cap, while the score is below 95 and open items remain, ask `Extend/m;
    // Assert
    assert.match(text, rule);
    assert.match(text, trigger);
  });

  test('update-rules SKILL.md asks to extend only while the score is below 95', () => {
    // Arrange
    const text = skillMd('update-rules');
    // Act
    const trigger =
      /^- Pass score = 95\/100.* At the cap, while the score is below 95 and open items remain, ask `Extend/m;
    const stale = /At the cap, while open items remain/;
    // Assert
    assert.match(text, trigger);
    assert.doesNotMatch(text, stale);
  });
});

describe('audit skills brief a write scope and stop without git', () => {
  const briefs = {
    'audit-skill': /^Write scope: <absolute target skill directory>$/m,
    'audit-subagent': /^Write scope: <absolute target subagent file>$/m
  };
  const noGit = {
    'audit-skill':
      /^ {3}- \*\*6c\. Implement\.\*\* First run `git diff --stat -- <dir>`; it fails \(no git\) → do not invoke implement-spec, leave the fixes under `Open:`, `Result: stopped`, `Stopped: 6: no git` \(this ends the whole run; the fixes of every remaining target go under `Open:`\)/m,
    'audit-subagent':
      /^ {3}- \*\*6c\. Implement\.\*\* First run `git diff --stat -- <file>`; it fails \(no git\) → do not invoke implement-spec, leave the fixes under `Open:`, `Result: stopped`, `Stopped: 6: no git` \(this ends the whole run; the fixes of every remaining target go under `Open:`\)/m
  };
  for (const skill of ['audit-skill', 'audit-subagent']) {
    test(`${skill} Spec brief has a literal Write scope line`, () => {
      // Arrange
      const text = readRel(`skills/${skill}/references/briefs.md`);
      // Act
      const scope = briefs[skill].test(text);
      const dir = /^Target directory: <absolute parent directory of the target file>/m.test(text);
      // Assert
      assert.ok(scope, 'Write scope line missing');
      assert.equal(dir, skill === 'audit-subagent');
    });

    test(`${skill} stops with no git before invoking implement-spec`, () => {
      // Arrange
      const text = skillMd(skill);
      // Act
      const stop = noGit[skill].test(text);
      const footer = /^`stopped` covers .*, a no-git scope stop, and cannot interact; a cap stop never sets it/m.test(
        text
      );
      const stale = /^ +- \*\*6d\. Check scope\.\*\* With git/m.test(text);
      // Assert
      assert.ok(stop, 'no-git stop missing at 6c');
      assert.ok(footer, 'no-git scope stop missing from the stopped sentence');
      assert.equal(stale, false);
    });
  }

  test('audit-subagent fallback scorer keeps Bash for the node -e sum only', () => {
    // Arrange
    const text = skillMd('audit-subagent');
    // Act
    const rule = /^ {3}- \*\*3b\.\*\* .*WebSearch, WebFetch, and Bash for the node -e sum only\)\./m.test(text);
    // Assert
    assert.ok(rule, 'node -e sum tool missing from the fallback');
  });
});

describe('update-readme scorer runs command -v on a safe name only', () => {
  test('spawns.md restricts the tool name and marks A1 unverified otherwise', () => {
    // Arrange
    const text = readRel('skills/update-readme/references/spawns.md');
    // Act
    const spawn = /^Spawn the `cdk:rubric-scorer` subagent .*Bash for `command -v <tool>` only\)\./m;
    const check =
      /^- A1: .*run only when the tool name matches `\^\[A-Za-z0-9\._\+\]\[A-Za-z0-9\._\+-\]\*\$`, otherwise mark A1 unverified\)\./m;
    const old = /\^\[A-Za-z0-9\._\+-\]\+\$/;
    // Assert
    assert.match(text, spawn, 'spawn line should end at command -v only');
    assert.match(text, check, 'name check on command -v missing at A1');
    assert.doesNotMatch(text, old, 'old name pattern still present');
  });
});

describe('update-rules SKILL.md moves Known issues to memory before removing the section', () => {
  test('resolves the memory directory first and removes the section only after the write', () => {
    // Arrange
    const text = skillMd('update-rules');
    // Act
    const resolve =
      /^ {3}- For a `Known issues` move, resolve the existing auto-memory directory first \(path from the `MEMORY\.md` path .*none found → keep the section and list it under `Open:`\), then write the `feedback` memory/m;
    const remove =
      /^ {3}- Remove the `Known issues` section only after that memory write succeeded, so the content is never lost\./m;
    // Assert
    assert.match(text, resolve, 'resolve-first rule missing');
    assert.match(text, remove, 'remove-after-write rule missing');
  });
});

describe('update-rules flow.md ties --yes choices to Open and defines the step 5 variant', () => {
  test('--yes takes the first-listed Recommended option and lists it under Open', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/flow.md');
    // Act
    const rule =
      /^- `--yes` or unattended runs follow the SKILL\.md Rules: a choice takes the Recommended option \(the tie-break: the first-listed one\) and goes under `Open:`; fact gaps go to `Omitted:`/m;
    // Assert
    assert.match(text, rule);
  });

  test('step 5 variant applies the step 4 draft with the printed diff as the criterion', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/flow.md');
    // Act
    const rule =
      /^- Step 5 variant \(runs before the first score\): requirement "apply the step 4 draft"; one goal per file listed at step 4, with the printed diff as its acceptance criterion; `Write scope:` the step 4 files; `Approach: fixed to the printed diff`; it shares only the non-goals, `Tests:`, and no-formatter fields above/m;
    // Assert
    assert.match(text, rule);
  });
});

describe('update-readme flow.md resolves fact gaps before implement-spec', () => {
  test('asks each fact gap with an Omit option, and omits it on --yes', () => {
    // Arrange
    const text = readRel('skills/update-readme/references/flow.md');
    // Act
    const rule =
      /^- Before invoking implement-spec, resolve each fact gap \(license, URL, version, contact, badge\) → AskUserQuestion with an "Omit" option \(max 4 per call\)\. `--yes` or unattended runs ask nothing: add it to `Omitted:`\./m;
    // Assert
    assert.match(text, rule);
  });
});

describe('update-rules repeats.md does not gather auto memory', () => {
  test('Sources says auto memory is not gathered', () => {
    // Arrange
    const text = readRel('skills/update-rules/references/repeats.md');
    // Act
    const rule =
      /^Count an instruction as repeated when .*`\.claude\/rules\/\*\*\/\*\.md` \(auto memory is not gathered here\)\./m;
    // Assert
    assert.match(text, rule);
  });
});

describe('build-skill grill.md keeps default weights printed first', () => {
  test('print-before-scoring is kept and the No stated goals bullet is skipped', () => {
    // Arrange
    const text = readRel('skills/build-skill/references/grill.md');
    // Act
    const rule =
      /^- 3–6 criteria taken from the user's stated goals, never from a preferred option; .*still printed before any option is scored, and skips the "No stated goals" bullet\./m;
    // Assert
    assert.match(text, rule);
  });
});

describe('build-skill evals.md aligns dirty-tracked-edit with the audit dirty-target evals', () => {
  test('dirty-tracked-edit scores and edits the target with Stopped: none', () => {
    // Arrange
    const text = readRel('skills/build-skill/references/evals.md');
    // Act
    const row =
      /^\| dirty-tracked-edit +\|.*\| Scores and edits the target +\| Applies the VERIFIED fixes through implement-spec; `Stopped: none` +\|$/m;
    // Assert
    assert.match(text, row);
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
