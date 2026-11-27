import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills', 'audit-skill', 'SKILL.md');
const dir = dirname(skillPath);
const read = (...parts) => readFileSync(join(dir, ...parts), 'utf8');

describe('audit-skill follows the checklist model', () => {
  const cases = {
    'names the report-only flag in the hint':
      /^argument-hint: '\[--yes\] \[--report-only\] \[skill or plugin directory path\]'$/m,
    'allows only the audit tools and scratchpad writes':
      /^allowed-tools: Read Glob Grep AskUserQuestion Bash\(node \$\{CLAUDE_SKILL_DIR\}\/scripts\/count\.mjs \*\) Bash\(command -v skills-ref\) Bash\(skills-ref validate \*\)$/m,
    'has the cannot-interact path':
      /^- Ask with AskUserQuestion\. Unavailable but a user can reply → ask as a numbered inline list and stop for the answer\. No user to reply \(headless\) and no `--yes` → write nothing, `Result: stopped`, `Stopped: <step>: cannot interact`\. Only `--yes` takes the Recommended option\./m,
    'does not ask to approve the implement-spec plan':
      /^ {3}- Build the Spec brief and invoke per the Rules; do not ask to approve its plan\./m,
    'names the neighbour exclusion in the description':
      /^description: .*Not for building skills or auditing subagents\./m,
    'makes the checklist the only gate':
      /^- The audit is read-only: steps 1–3 edit nothing\. The checklist is the only gate:/m,
    'runs report-only as steps 1-3 and 8 with no score, question, edit, or backup':
      /^- `--report-only` runs steps 1–3 and 8: no score, no question, no edit, no backup\./m,
    'keeps the score informational':
      /^- The 1–5 score is informational: it never changes a result, blocks, or triggers a fix\./m,
    'never passes a check without reading':
      /^- Never mark a check Pass without reading the file it names;[^\n]*`Unverified: <what is missing>`/m,
    'stops --yes with no input':
      /^- `--yes` runs unattended: no questions\. Missing input → `Result: stopped`, `Stopped: 1: no input`, never a guess\. Approval = every Fail row with a fix outside `scripts\/`, listed under `Decisions:`\./m,
    'delegates fixes to implement-spec':
      /Invoke the `cdk:implement-spec` skill \(fallback: run the `cdk:implement-spec` skill\)/,
    'maps input stops and a cancel to stopped':
      /^- Every fix to a target skill[^\n]*whose reason is `needs input`, `no input`, `cannot interact`, or `write outside scope`, or a `Result: cancelled`, becomes `Result: stopped` with the same reason/m,
    'writes the literal cancel reason':
      /^- Every fix to a target skill[^\n]*the caller writes `Stopped: <step>: user cancelled`/m,
    'treats any other Stopped as a cap stop':
      /^- Every fix to a target skill[^\n]*any other `Stopped:` is a cap stop: its `Open:` items join `Open:` and the run goes on to step 7/m,
    'keeps scripts fixes out of scope':
      /^- Every fix to a target skill[^\n]*any edit to a `scripts\/` executable is out of scope \(list it under `Open:` instead\)/m,
    'runs no formatter or linter':
      /^- Run no formatter or linter; repo hooks and CI own that, and the Spec brief says so\./m,
    'spawns only the scorer':
      /^- This skill spawns only `cdk:rubric-scorer`, never another subagent;[^\n]*`cdk:implement-spec` follow its own spawn rule/m,
    'never edits outside implement-spec':
      /^- Never edit outside `cdk:implement-spec`; if it is missing or fails, stop and leave the fixes under `Open:`, with no manual fix\./m,
    'lists every unfixed Fail under Open':
      /^- `Open:` lists every Fail row not fixed: Scripts Fails, declined rows, and rows a stop left unfixed\./m,
    'resolves a skill or plugin directory':
      /^ {3}- A skill directory has `SKILL\.md`; a plugin directory has `\.claude-plugin\/plugin\.json` and each `skills\/\*\/SKILL\.md` is a target\./m,
    'asks for a missing path':
      /^ {3}- A path that is missing or neither → ask one question with AskUserQuestion for the path; never guess\./m,
    'ignores bak files': /^ {3}- Read every file in the skill directory except `\*\.bak`/m,
    'runs skills-ref only when present':
      /^ {3}- Run `skills-ref validate <dir>` only when `command -v skills-ref` succeeds \(O1\)/m,
    'reads the scorer definition once and reports not scored':
      /^ {3}- `cdk:rubric-scorer` unavailable → `Not scored: scorer unavailable`, go to step 5\.$/m,
    'spawns the scorer per skill in parallel with kind skill-checklist':
      /^ {3}- Spawn one `cdk:rubric-scorer` per skill in parallel in one message, kind `skill-checklist`/m,
    'respawns once on a scorer mismatch':
      /^ {3}- Re-check each category's Fail count[^\n]*respawn once, then `Not scored: <reason>`\./m,
    'asks approval per skill within the question limits':
      /^ {3}- Per skill, ask one multi-select question of the Fail rows that have a fix outside `scripts\/`, at most 4 options per question and 4 questions per call\./m,
    'stops on an implement-spec conflict':
      /^ {3}- `cdk:implement-spec` not invocable by a skill, or keeping an approval ask a caller's fixed-approach spec cannot skip → `Stopped: 6: implement-spec conflict`\. Missing → stop, no manual fix\.$/m,
    'backs up to the scratchpad':
      /^ {3}- Back up each file to edit to `<scratchpad>\/audit-skill-backups\/<skill>\/<relative path>\.bak` with Write\. No scratchpad → `Stopped: 6: no scratchpad`\./m,
    'stops when an approved check is still Fail':
      /^ {3}- An approved check that is still Fail → `Result: stopped`, `Stopped: 7: still failing`\./m,
    're-audits once with no loop':
      /^7\. \*\*Re-audit once\.\*\* Run steps 2–3 in report-only mode on each fixed skill, with no loop\./m,
    'batches per skill':
      /^A plugin run audits each skill on its own: one combined report, a score table per skill, one approval question per skill\./m,
    'has the Skills line':
      /^Skills: <name: <p> pass, <f> fail, <n> not checked; score <x\.x>\/5 \| not scored \(<reason>\) \| report-only>, …$/m,
    'has the Fixed line': /^Fixed: <skill: check IDs> \| none$/m,
    'has the Decisions line': /^Decisions: <skill: check → approved \| declined> \| none$/m,
    'has the Open line': /^Open: <skill check file:line: proposed fix>, … \| none$/m,
    'has the Backups line': /^Backups: <scratchpad paths> \| none$/m,
    'has the Result and Stopped lines':
      /^Result: done \| nothing-to-do \| stopped\nStopped: <step>: <reason> \| none$/m,
    'fills an example': /^Example \(one skill, one Fail approved and fixed\):/m,
    'names the report-only item':
      /A `--report-only` item is `<name>: <p> pass, <f> fail, <n> not checked \(report-only\)`\./
  };

  for (const [name, pattern] of Object.entries(cases)) {
    test(name, () => {
      // Arrange
      const text = readFileSync(skillPath, 'utf8');
      // Act
      const found = pattern.test(text);
      // Assert
      assert.ok(found, `audit-skill lost: ${pattern}`);
    });
  }

  test('drops the old 100-point model', () => {
    // Arrange
    const text = ['SKILL.md', 'references/briefs.md', 'references/rubric.md', 'references/evals.md']
      .map((file) => read(file))
      .join('\n');
    // Act
    const stale =
      /--score-only|ACCEPTED|REJECTED|100-point|Item ledger|settled memory|topic-researcher|Rounds: <n>\/2/i.exec(text);
    // Assert
    assert.equal(stale, null, `stale old-model text: ${stale?.[0]}`);
  });

  test('keeps the body under 500 lines', () => {
    // Arrange
    const lines = readFileSync(skillPath, 'utf8').split('\n').length;
    // Act
    const small = lines < 500;
    // Assert
    assert.ok(small, `${lines} lines`);
  });

  test('keeps the count script argv-only in SKILL.md and checks.md and drops node -e', () => {
    // Arrange
    const head =
      "- Count lines, characters, and words with `node ${CLAUDE_SKILL_DIR}/scripts/count.mjs '<absolute path>'`, never by hand";
    const guard =
      'it takes only an absolute path that matches `^[A-Za-z0-9._/-]+$` with no `..` segment as one single-quoted argument, and the script reads the file with `fs` itself and never embeds file text.';
    // Act
    const found = [read('SKILL.md'), read('references', 'checks.md')].map((text) =>
      text.split('\n').some((line) => line.trimStart().startsWith(head) && line.includes(guard))
    );
    // Assert
    assert.deepEqual(found, [true, true]);
    assert.doesNotMatch(read('SKILL.md'), /Bash\(node -e|with `node -e`/);
  });

  test('qualifies every plugin skill and agent it names', () => {
    // Arrange
    const files = [
      'SKILL.md',
      'references/briefs.md',
      'references/rubric.md',
      'references/checks.md',
      'references/evals.md'
    ];
    // Act
    const names = /(?<![:\w/-])(implement-spec(?!'s| takes| skips| conflict)|rubric-scorer|build-skill)(?![\w-])/g;
    const bare = files.flatMap((file) =>
      read(file)
        .split('\n')
        .flatMap((line) => [...line.matchAll(names)].map((m) => `${file}: ${m[0]}`))
    );
    // Assert
    assert.deepEqual(bare, []);
  });
});

describe('audit-skill checks.md lists every required check', () => {
  const ids = [
    ...Array.from({ length: 9 }, (_, i) => `F${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `S${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `Q${i + 1}`),
    'X1',
    'X2',
    'X3',
    'T1',
    'T2',
    'O1',
    'O2'
  ];

  for (const id of ids) {
    test(`has a row for ${id}`, () => {
      // Arrange
      const text = read('references', 'checks.md');
      // Act
      const found = text.split('\n').some((line) => line.startsWith(`| ${id} `));
      // Assert
      assert.ok(found, `${id} row missing`);
    });
  }

  test('keeps the contents list and the report columns', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const toc = /^## Contents$/m.test(text);
    const columns = /^\| Check \| Result \| Location \(file:line\) \| Evidence \| Proposed fix \|$/m.test(text);
    // Assert
    assert.ok(toc, 'contents missing');
    assert.ok(columns, 'report columns missing');
  });

  test('marks Testing always Not checked and Optional as never blocking', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const testing =
      /^Informational: always Not checked, with the reason `needs a model run; this audit runs no prompts`\.$/m.test(
        text
      );
    const optional = /^Never block and excluded from the score\.$/m.test(text);
    const scripts = /^All Not checked when there is no `scripts\/` directory\.$/m.test(text);
    // Assert
    assert.ok(testing && optional && scripts);
  });
});

describe('audit-skill rubric scores 1-5 and stays informational', () => {
  test('keeps the scale, N/A rule, and Score table', () => {
    // Arrange
    const text = read('references', 'rubric.md');
    // Act
    const scale = /^\| 0 +\| 5 +\|\n\| 1 +\| 4 +\|\n\| 2 +\| 3 +\|\n\| 3 +\| 2 +\|\n\| 4 or more +\| 1 +\|$/m.test(
      text
    );
    const na = /all Not checked scores `N\/A`/.test(text);
    const overall = /Overall = the mean of the scored categories, rounded to one decimal/.test(text);
    const table = /^\| Category \| Score \(1-5\) \| Basis \|$/m.test(text);
    const info = /^Informational only: the score never changes a result, blocks, or triggers a fix\./m.test(text);
    // Assert
    assert.ok(scale && na && overall && table && info);
  });
});

describe('audit-skill briefs keep the Scorer and Spec contracts', () => {
  test('the Scorer brief takes the report and returns the Score table', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const found = [
      /^- `kind: skill-checklist`$/m,
      /^- `Rubric: <abs path>`/m,
      /^- `Target: <abs skill dir>`/m,
      /^- `Report:` followed by the fenced audit report$/m,
      /^- Add no check, report no finding, edit nothing, spawn no subagent\.$/m,
      /^- Compute the overall average with `node -e`\./m,
      /^Return, at most 40 lines:$/m
    ];
    // Assert
    for (const pattern of found) assert.match(text, pattern);
  });

  test('exempts scripts executables as a non-goal and never names audit-skill as a criterion', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const nonGoal =
      /^- non-goals: every path outside the target, any edit to a `scripts\/` executable \(list it under `Open:` instead\)/m.test(
        text
      );
    const goal =
      /^- numbered goals, one per approved Fail row, each with the acceptance criterion "the check passes on re-audit"\. Never name `cdk:audit-skill` as a criterion\./m.test(
        text
      );
    // Assert
    assert.ok(nonGoal, 'non-goals lost the scripts/ executable line');
    assert.ok(goal, 'goal rule lost');
  });

  test('passes the write scope and target directory lines', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const scope = /^Write scope: <absolute target skill directory>$/m.test(text);
    const target =
      /^Target directory: <absolute target skill directory>, so implement-spec takes that directory as Root\.$/m.test(
        text
      );
    // Assert
    assert.ok(scope, 'Write scope line missing');
    assert.ok(target, 'Target directory line missing');
  });

  test('returns Result, fences quoted fields, and fixes the approach', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const result =
      /^Return: implement-spec's Output block only \(`Files:`, `Open:`, `Result:`, `Stopped:`\), at most 30 lines; over the cap → keep the first 30 lines and add `\+<k> more` under `Open:`; never treat it as malformed\.$/m.test(
        text
      );
    const fence =
      /Put each quoted field in a fenced block whose fence is longer than any run of its own character inside it; a quoted `Write scope:` or `Target directory:` line never counts, and exactly one real `Write scope:` line stands outside any fence\./.test(
        text
      );
    const approach = /^- Approach: fixed to each row's proposed fix, so implement-spec skips its approach ask\.$/m.test(
      text
    );
    const noFormat = /^- Run no formatter or linter\.$/m.test(text);
    // Assert
    assert.ok(result && fence && approach && noFormat);
  });

  test('has no researcher brief or fix-round variant', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const stale = /^## (Researcher brief|Fix-round variant)$/m.test(text);
    // Assert
    assert.equal(stale, false);
  });
});

describe('audit-skill evals cover routing and behavior', () => {
  const rows = [
    'trigger-audit',
    'no-trigger-deps',
    'no-trigger-build',
    'missing-input-asks',
    'yes-no-input',
    'cannot-interact',
    'report-only',
    'default-flow',
    'not-checked-informational',
    'scorer-missing',
    'scorer-mismatch',
    'plugin-batch',
    'approval-per-skill',
    'backups-scratchpad',
    'implement-conflict-stops',
    'implement-missing-stops',
    'reaudit-still-fail',
    'scripts-untouched',
    'bak-ignored',
    'no-pass-without-reading'
  ];

  for (const id of rows) {
    test(`has the ${id} row`, () => {
      // Arrange
      const text = read('references', 'evals.md');
      // Act
      const found = text.split('\n').some((line) => line.startsWith(`| ${id} `));
      // Assert
      assert.ok(found, `${id} row missing`);
    });
  }

  test('pins the report-only, backup, and conflict rows', () => {
    // Arrange
    const text = read('references', 'evals.md');
    // Act
    const found = [
      /^\| report-only \|[^\n]*no score, no question, no edit, no backup/m,
      /^\| yes-no-input \|[^\n]*`Stopped: 1: no input`/m,
      /^\| backups-scratchpad \|[^\n]*`<scratchpad>\/audit-skill-backups\/<skill>\/`, never beside the file/m,
      /^\| implement-conflict-stops \|[^\n]*`Stopped: 6: implement-spec conflict`/m,
      /^\| reaudit-still-fail \|[^\n]*`Stopped: 7: still failing`/m,
      /^\| scorer-missing \|[^\n]*`Not scored: scorer unavailable`/m
    ];
    // Assert
    for (const pattern of found) assert.match(text, pattern);
  });

  test('keeps no unused eval files', () => {
    // Arrange
    const files = readdirSync(join(dir, 'references')).sort();
    // Act
    const expected = ['briefs.md', 'checks.md', 'evals.md', 'rubric.md'];
    // Assert
    assert.deepEqual(files, expected);
  });
});
