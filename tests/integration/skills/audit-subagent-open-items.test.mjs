import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'skills',
  'audit-subagent',
  'SKILL.md'
);
const dir = dirname(skillPath);
const read = (...parts) => readFileSync(join(dir, ...parts), 'utf8');

describe('audit-subagent follows the checklist model', () => {
  const cases = {
    'names the report-only flag in the hint':
      /^argument-hint: '\[--yes\] \[--report-only\] \[subagent file or plugin directory path\]'$/m,
    'allows only the audit tools and backup writes':
      /^allowed-tools: Read Glob Grep Write AskUserQuestion Bash\(node -e \*\) Bash\(claude plugin validate \*\)$/m,
    'names the neighbour exclusions in the description':
      /^description: .*Not for building a subagent or auditing skills\.$/m,
    'makes the checklist the only gate':
      /^- The audit is read-only: steps 1–3 edit nothing\. The checklist is the only gate:/m,
    'runs report-only as steps 1-3 and 8 with no score, question, edit, or backup':
      /^- `--report-only` runs steps 1–3 and 8: no score, no question, no edit, no backup\. `cdk:build-subagent` and the verification step 7 use it\./m,
    'keeps the score informational':
      /^- The 1–5 score is informational: it never changes a result, blocks, or triggers a fix\./m,
    'never passes a check without reading':
      /^- Never mark a check Pass without reading the file it names;[^\n]*`Unverified: <what is missing>`/m,
    'stops --yes with no input':
      /^- `--yes` runs unattended: no questions\. Missing input → `Result: stopped`, `Stopped: 1: no input`, never a guess\. Approval = every Fail row, listed under `Decisions:`\./m,
    'delegates fixes to implement-spec':
      /Invoke the `cdk:implement-spec` skill \(fallback: run the `cdk:implement-spec` skill\)/,
    'maps input stops and a cancel to stopped':
      /^- Every fix to a target subagent[^\n]*whose reason is `needs input`, `no input`, or `write outside scope`, or a `Result: cancelled`, becomes `Result: stopped` with the same reason/m,
    'writes the literal cancel reason':
      /^- Every fix to a target subagent[^\n]*a cancel keeps implement-spec's reason, so the caller writes `Stopped: <step>: user cancelled`/m,
    'treats any other Stopped as a cap stop':
      /^- Every fix to a target subagent[^\n]*any other `Stopped:` is a cap stop: its `Open:` items join `Open:` and the run goes on to step 7/m,
    'limits the write scope to the target subagent file and backups':
      /^- Every fix to a target subagent[^\n]*edits nothing itself except `<file>\.bak` backups\. Its write scope is each target subagent file/m,
    'depends on implement-spec for fixing only':
      /^- `cdk:implement-spec` is a hard dependency for fixing only; the audit, report, and score never need it\./m,
    'runs no formatter or linter':
      /^- Run no formatter or linter; repo hooks and CI own that, and the Spec brief says so\./m,
    'spawns only the scorer':
      /^- This skill spawns only `cdk:rubric-scorer`, never another subagent;[^\n]*`cdk:implement-spec` follow its own spawn rule/m,
    'never edits outside implement-spec':
      /^- Never edit outside `cdk:implement-spec`; if it is missing or fails, stop and leave the fixes under `Open:`, with no manual fix\./m,
    'lists every unfixed Fail under Open':
      /^- `Open:` lists every Fail row not fixed: declined rows and rows a stop left unfixed\./m,
    'resolves a subagent file or plugin directory':
      /^ {3}- A subagent file is one `\.md` file; a plugin directory has `\.claude-plugin\/plugin\.json` and each `agents\/\*\*\/\*\.md` is a target, skipping `\*\.bak`\./m,
    'asks for a missing path':
      /^ {3}- A path that is missing or neither → ask one question with AskUserQuestion for the path; never guess\./m,
    'ignores bak files': /^ {3}- Read the subagent file and every file its body names[^\n]*never read `\*\.bak`\./m,
    'counts with node -e': /^ {3}- Count lines, characters, and words with `node -e`, never by hand;/m,
    'runs plugin validate only for a plugin directory':
      /^ {3}- Run `claude plugin validate <plugin dir>` for O1 only on a plugin directory; if it cannot run, O1 is Not checked\./m,
    'reads the scorer definition once and reports not scored':
      /^ {3}- Read `\$\{CLAUDE_SKILL_DIR\}\/\.\.\/\.\.\/agents\/rubric-scorer\.md` once; not found → `Not scored: definition not found`/m,
    'spawns the scorer per subagent in parallel with kind subagent-checklist':
      /^ {3}- Spawn one `cdk:rubric-scorer` per subagent in parallel in one message, kind `subagent-checklist`/m,
    'respawns once on a scorer mismatch':
      /^ {3}- Re-check each category's Fail count[^\n]*respawn once, then `Not scored: <reason>`\./m,
    'asks approval per subagent within the question limits':
      /^ {3}- Per subagent, ask one multi-select question of the Fail rows, at most 4 options per question and 4 questions per call\./m,
    'stops on an implement-spec conflict':
      /^ {3}- Read `\$\{CLAUDE_SKILL_DIR\}\/\.\.\/implement-spec\/SKILL\.md`\. It sets `disable-model-invocation: true`[^\n]*`Stopped: 6: implement-spec conflict`/m,
    'backs up beside the file, never as markdown':
      /^ {3}- Write a backup of each file to edit to `<file>\.bak` beside it with Write, never `\.md`/m,
    'does not ask to approve the plan':
      /^ {3}- Build the Spec brief and invoke per the Rules; do not ask to approve its plan\./m,
    'stops when an approved check is still Fail':
      /^ {3}- An approved check that is still Fail → `Result: stopped`, `Stopped: 7: still failing`\./m,
    're-audits once with no loop':
      /^7\. \*\*Re-audit once\.\*\* Run steps 2–3 in report-only mode on each fixed subagent, with no loop\./m,
    'batches per subagent':
      /^A plugin run audits each subagent on its own: one combined report, a score table per subagent, one approval question per subagent\./m,
    'has the Subagents line':
      /^Subagents: <name: <p> pass, <f> fail, <n> not checked; score <x\.x>\/5 \| not scored \(<reason>\) \| report-only>, …$/m,
    'has the Fixed line': /^Fixed: <subagent: check IDs> \| none$/m,
    'has the Decisions line': /^Decisions: <subagent: check → approved \| declined> \| none$/m,
    'has the Open line': /^Open: <subagent check file:line: proposed fix>, … \| none$/m,
    'has the Backups line': /^Backups: <file>\.bak paths \| none$/m,
    'has the Result and Stopped lines':
      /^Result: done \| nothing-to-do \| stopped\nStopped: <step>: <reason> \| none$/m,
    'covers the stop reasons in the footer':
      /^`stopped` covers an input stop, a `cdk:implement-spec` stop or cancel, and an approved check still Fail at the re-audit\./m,
    'fills an example': /^Example \(one subagent, one Fail approved and fixed\):/m,
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
      assert.ok(found, `audit-subagent lost: ${pattern}`);
    });
  }

  test('drops the old 100-point model', () => {
    // Arrange
    const text = ['SKILL.md', 'references/briefs.md', 'references/rubric.md', 'references/evals.md']
      .map((file) => read(file))
      .join('\n');
    // Act
    const stale =
      /--score-only|subagent-audit|ACCEPTED|REJECTED|100-point|Item ledger|settled memory|topic-researcher|Rounds: <n>\/2/i.exec(
        text
      );
    // Assert
    assert.equal(stale, null, `stale old-model text: ${stale?.[0]}`);
  });

  test('keeps no web, scripts, git, scratchpad, or memory leftovers in the skill', () => {
    // Arrange
    const text = readFileSync(skillPath, 'utf8');
    // Act
    const stale = /WebSearch|WebFetch|scripts\/|git -C|scratchpad|Fix memory/i.exec(text);
    // Assert
    assert.equal(stale, null, `stale text: ${stale?.[0]}`);
  });

  test('keeps the body under 500 lines', () => {
    // Arrange
    const lines = readFileSync(skillPath, 'utf8').split('\n').length;
    // Act
    const small = lines < 500;
    // Assert
    assert.ok(small, `${lines} lines`);
  });

  test('keeps the description within 400 characters', () => {
    // Arrange
    const description = /^description: (.*)$/m.exec(readFileSync(skillPath, 'utf8'))?.[1] ?? '';
    // Act
    const length = description.length;
    // Assert
    assert.ok(length > 0 && length <= 400, `${length} characters`);
  });

  test('spawns only cdk:rubric-scorer', () => {
    // Arrange
    const text = readFileSync(skillPath, 'utf8');
    // Act
    const spawns = text.split('\n').filter((line) => /\bSpawn\b/.test(line));
    // Assert
    assert.equal(spawns.length, 1);
    assert.match(spawns[0], /cdk:rubric-scorer/);
  });

  test('keeps node -e argv-only at both counting sites', () => {
    // Arrange
    const head = '- Count lines, characters, and words with `node -e`, never by hand;';
    const guard =
      'it takes only an absolute path that matches `^[A-Za-z0-9._/-]+$` with no `..` segment, plus numbers, as single-quoted argv, and the script reads the file with `fs` itself and never embeds file text.';
    // Act
    const missing = ['SKILL.md', 'references/checks.md'].filter(
      (file) =>
        !read(file)
          .split('\n')
          .some((line) => line.trimStart().startsWith(head) && line.includes(guard))
    );
    // Assert
    assert.deepEqual(missing, []);
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
    const names =
      /(?<![:\w/-])(implement-spec(?!'s| takes| skips| conflict)|rubric-scorer|build-subagent|audit-skill)(?![\w-])/g;
    const bare = files.flatMap((file) =>
      read(file)
        .split('\n')
        .flatMap((line) => [...line.matchAll(names)].map((m) => `${file}: ${m[0]}`))
    );
    // Assert
    assert.deepEqual(bare, []);
  });
});

describe('audit-subagent checks.md lists every required check', () => {
  const ids = [
    ...Array.from({ length: 10 }, (_, i) => `F${i + 1}`),
    ...Array.from({ length: 5 }, (_, i) => `S${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `P${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `T${i + 1}`),
    'E1',
    'E2',
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
    // Assert
    assert.ok(testing && optional);
  });

  test('fails a plugin agent that sets an ignored field', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const row = text.split('\n').find((line) => line.startsWith('| T4 ')) ?? '';
    // Assert
    assert.match(
      row,
      /A plugin agent sets none of `hooks`, `mcpServers`, `permissionMode`, `initialPrompt` \(a plugin ignores them\)/
    );
  });

  test('marks a version-gated field Unverified when the version is unknown', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const found =
      /^- A field gated to a Claude Code version is Unverified when that version is unknown: the session or the user gives it, never a guess\.$/m.test(
        text
      );
    // Assert
    assert.ok(found);
  });

  test('lists the always-removed tools and the disallowedTools specifier rule in T2', () => {
    // Arrange
    const row = read('references', 'checks.md')
      .split('\n')
      .find((line) => line.startsWith('| T2 '));
    // Act
    const words = ['propose_skills', 'plan-mode entry and exit tools', 'Bash(git push *)', 'fails to launch'];
    // Assert
    for (const word of words) assert.ok(row?.includes(word), `T2 lost ${word}`);
  });

  test('labels house rules apart from docs facts', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const found = /^- F2 \(name charset\), S2 \(filename equals `name`\), F4 \(≤400 chars\)[^\n]*house rules/m.test(
      text
    );
    // Assert
    assert.ok(found);
  });

  test('pins the restored and added check wording', () => {
    // Arrange
    const rows = Object.fromEntries(
      read('references', 'checks.md')
        .split('\n')
        .filter((line) => /^\| [FSPTO]\d+ /.test(line))
        .map((line) => [line.split(' ')[1], line])
    );
    // Act
    const pins = {
      F8: ['Fail when either is omitted'],
      F10: ['autoCompactWindow', 'permissionMode', '`200k` reads as 200'],
      S3: ['overrides a plugin agent'],
      P5: ['blocked, out of scope, or the input is ambiguous'],
      P7: ['Self-check before returning'],
      P8: ['Subagent fit'],
      T1: ['`memory` adds Read, Write, and Edit'],
      T2: ['background tool list'],
      T3: ['`Agent(type)` in `tools` is ignored'],
      T4: ['takes effect only when the agent runs as the main session'],
      O1: ['v2.1.233']
    };
    // Assert
    for (const [id, words] of Object.entries(pins))
      for (const word of words) assert.ok(rows[id]?.includes(word), `${id} lost ${word}`);
  });

  test('reports one row per check', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const found = /one row per check/.test(text) && !/may be omitted/.test(text);
    // Assert
    assert.ok(found);
  });

  test('keeps the report fence as text', () => {
    // Arrange
    const text = read('references', 'checks.md');
    // Act
    const found = /^## Report format\n[\s\S]*\n```text\n<subagent>: <p> pass, <f> fail, <n> not checked\n/m.test(text);
    // Assert
    assert.ok(found);
  });
});

describe('audit-subagent rubric scores 1-5 and stays informational', () => {
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

  test('maps the five categories to check IDs and excludes O1 and O2', () => {
    // Arrange
    const text = read('references', 'rubric.md');
    // Act
    const found = [
      /^\| Frontmatter +\| F1–F10 +\|$/m,
      /^\| Structure and location +\| S1–S5 +\|$/m,
      /^\| Prompt quality +\| P1–P8 +\|$/m,
      /^\| Tools and permissions +\| T1–T7 +\|$/m,
      /^\| Testing +\| E1–E2 +\|$/m,
      /^`O1` and `O2` are excluded from every category\.$/m
    ];
    // Assert
    for (const pattern of found) assert.match(text, pattern);
  });
});

describe('audit-subagent briefs keep the Scorer and Spec contracts', () => {
  test('the Scorer brief takes the report and returns the Score table', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const found = [
      /^- `kind: subagent-checklist`$/m,
      /^- `Rubric: <abs path>`/m,
      /^- `Target: <abs subagent file>`/m,
      /^- `Report:` followed by the fenced audit report$/m,
      /^- Add no check, report no finding, edit nothing, spawn no subagent\.$/m,
      /^- Compute the overall average with `node -e`\./m,
      /^Return, at most 40 lines:$/m
    ];
    // Assert
    for (const pattern of found) assert.match(text, pattern);
  });

  test('sets the goal rule and never names audit-subagent as a criterion', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const nonGoal =
      /^- non-goals: every path outside the target, any row not approved, and any change to the target's job, name, or scope\.$/m.test(
        text
      );
    const goal =
      /^- numbered goals, one per approved Fail row, each with the acceptance criterion "the check passes on re-audit"\. Never name `cdk:audit-subagent` as a criterion\./m.test(
        text
      );
    // Assert
    assert.ok(nonGoal, 'non-goals line lost');
    assert.ok(goal, 'goal rule lost');
  });

  test('passes the write scope and target directory lines', () => {
    // Arrange
    const text = read('references', 'briefs.md');
    // Act
    const scope = /^Write scope: <absolute target subagent file>$/m.test(text);
    const target =
      /^Target directory: <absolute parent directory of the target file>, so implement-spec takes that directory as Root\.$/m.test(
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

describe('audit-subagent evals cover routing and behavior', () => {
  const rows = [
    'trigger-audit',
    'no-trigger-skill',
    'no-trigger-build',
    'missing-input-asks',
    'yes-no-input',
    'report-only',
    'default-flow',
    'not-checked-informational',
    'plugin-scope-fields',
    'version-gated-unverified',
    'scorer-missing',
    'scorer-mismatch',
    'plugin-batch',
    'approval-per-subagent',
    'backups-beside-file',
    'implement-conflict-stops',
    'implement-missing-stops',
    'reaudit-still-fail',
    'bak-ignored',
    'md-backup-fails',
    'no-pass-without-reading',
    'missing-self-check',
    'disallowed-specifier',
    'autocompact-shorthand',
    'house-rule-label'
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
      /^\| backups-beside-file \|[^\n]*`<file>\.bak` beside the subagent file, never `\.md`/m,
      /^\| implement-conflict-stops \|[^\n]*`Stopped: 6: implement-spec conflict`/m,
      /^\| reaudit-still-fail \|[^\n]*`Stopped: 7: still failing`/m,
      /^\| scorer-missing \|[^\n]*`Not scored: definition not found`/m,
      /^\| default-flow \|[^\n]*kind `subagent-checklist`/m
    ];
    // Assert
    for (const pattern of found) assert.match(text, pattern);
  });

  test('keeps no unused reference files', () => {
    // Arrange
    const files = readdirSync(join(dir, 'references'))
      .filter((file) => !file.endsWith('.bak'))
      .sort();
    // Act
    const expected = ['briefs.md', 'checks.md', 'evals.md', 'rubric.md'];
    // Assert
    assert.deepEqual(files, expected);
  });
});
