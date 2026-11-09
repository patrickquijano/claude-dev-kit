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

const frontmatter = (skill) => read(skill, 'SKILL.md').match(/^allowed-tools:.*$/m)?.[0] ?? '';

const marker = '<!-- cdk-review -->';
const levels = ['`critical`', '`major`', '`minor`', '`nit`', '`question`'];
const flowOf = (skill) => read(skill, 'references/flow.md');
const filesOf = (skill) => {
  const dir = join(root, 'skills', skill);
  return ['SKILL.md', ...readdirSync(join(dir, 'references')).map((f) => join('references', f))];
};

describe('address skills delegate fixes to implement-spec', () => {
  for (const skill of skills) {
    test(`${skill} SKILL.md and flow.md Implement name cdk:implement-spec`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      const implement = section(flowOf(skill), 'Implement');
      // Act
      const named = text.includes('cdk:implement-spec') && implement.includes('cdk:implement-spec');
      const once = /once/.test(implement);
      // Assert
      assert.ok(named && once, 'cdk:implement-spec missing or not called once');
    });

    test(`${skill} names no planner, implementer, or code-reviewer`, () => {
      // Arrange
      const files = filesOf(skill);
      // Act
      const offenders = files.filter((f) =>
        /implementation-planner|plan-implementer|code-reviewer|task-worker|rubric-improver/.test(
          readFileSync(join(root, 'skills', skill, f), 'utf8')
        )
      );
      // Assert
      assert.deepEqual(offenders, []);
    });

    test(`${skill} runs no lint, type-check, or test step`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      const flow = flowOf(skill);
      // Act
      const stepRuns = /^\d+\. \*\*(Verify|Iterate)\.\*\*/m.test(text) || /^## (Verify|Iterate)$/m.test(flow);
      const forbids = /runs no lint, type-check, or test command/.test(text);
      // Assert
      assert.ok(!stepRuns && forbids, 'a Verify or Iterate step exists or the no-check rule is missing');
    });

    test(`${skill} carries the shared Severity block and marker line`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      const block = section(text, 'Severity');
      // Act
      const hasLevels = levels.every((l) => block.includes(l));
      const hasMarker = block.includes(`Marker (review and address skills only): \`${marker}\``);
      const hasLine = block.includes('Severity = impact × likelihood, not personal preference.');
      // Assert
      assert.ok(hasLevels && hasMarker && hasLine, 'Severity block or marker line missing');
    });

    test(`${skill} Severity block matches the other address skill`, () => {
      // Arrange
      const blocks = skills.map((s) => section(read(s, 'SKILL.md'), 'Severity'));
      // Act
      const same = blocks[0] === blocks[1];
      // Assert
      assert.ok(blocks[0].length > 0 && same, 'Severity blocks differ');
    });

    test(`${skill} flow.md Outcome stops on a failed verification`, () => {
      // Arrange
      const outcome = section(flowOf(skill), 'Outcome');
      // Act
      const failure = outcome.includes('`Verify:` holds `fail`') && /unmet above 0/.test(outcome);
      const results = outcome.includes('`stopped` or `cancelled`');
      const stops = /Stopped: 5: verification failed/.test(outcome) && /Stopped: 5: user cancelled/.test(outcome);
      const skipped = outcome.includes('`skipped (<reason>)`') && /note each skipped entry under `Open:`/.test(outcome);
      const final = /no retry/.test(outcome) && /no reply/.test(outcome);
      // Assert
      assert.ok(failure && results && stops && skipped && final, 'Outcome stop conditions incomplete');
    });

    test(`${skill} never resolves and has no resolve row`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      const commands = read(skill, 'references/commands.md');
      const reply = section(flowOf(skill), 'Reply');
      // Act
      const matched = /^9\. \*\*Reply\.\*\*.*never resolve/m.test(text);
      const replyRule = /Never resolve a (thread|discussion)/.test(reply);
      const rows = commands
        .split('\n')
        .filter((l) => l.startsWith('| `'))
        .map((l) => l.split('|')[1].trim());
      const resolveRow = rows.some((r) => /resolve/i.test(r));
      const mutation = /resolveReviewThread|resolvable.*PUT|resolved=true/.test(commands);
      // Assert
      assert.ok(matched && replyRule && !resolveRow && !mutation, 'resolve is mentioned as an action');
    });

    test(`${skill} nit opt-in asks one question and --yes never fixes nits`, () => {
      // Arrange
      const triage = section(flowOf(skill), 'Triage');
      const text = read(skill, 'SKILL.md');
      // Act
      const question = triage.includes('`Fix nits too? No | Yes`');
      const yes = /`--yes` is No and never fixes nits/.test(triage) && /it never fixes nits/.test(text);
      // Assert
      assert.ok(question && yes, 'nit opt-in question or --yes rule missing');
    });

    test(`${skill} flow.md Triage reads severity and marks legacy labels inferred`, () => {
      // Arrange
      const triage = section(flowOf(skill), 'Triage');
      // Act
      const prefixes = ['[critical]', '[major]', '[minor]', '[nit]', '[question]'].every((p) => triage.includes(p));
      const inferred =
        /legacy label[^\n]*`blocker`[^\n]*`suggestion`[^\n]*`nitpick`/.test(triage) && /inferred/.test(triage);
      const ambiguous = /Ambiguous → ask/.test(triage) && /`--yes` → non-gating/.test(triage);
      // Assert
      assert.ok(prefixes && inferred && ambiguous, 'severity prefixes, inferred rule, or ambiguity rule missing');
    });

    test(`${skill} replies carry no marker and Identify recognizes it`, () => {
      // Arrange
      const flow = flowOf(skill);
      const reply = section(flow, 'Reply');
      const identify = section(flow, 'Identify');
      // Act
      const replyFree = /never carries the marker/.test(reply) && !reply.includes(marker);
      const recognized = identify.includes(marker) && /one pass|whole pass/.test(identify);
      // Assert
      assert.ok(replyFree && recognized, 'marker handling missing from Reply or Identify');
    });

    test(`${skill} namespaces commit-changes`, () => {
      // Arrange
      const files = filesOf(skill);
      // Act
      const offenders = files.filter((f) =>
        /(?<![:\w-])commit-changes skill|(?<![:`\w-])commit-changes(?![\w-])/.test(
          readFileSync(join(root, 'skills', skill, f), 'utf8').replace(/`cdk:commit-changes`|cdk:commit-changes/g, '')
        )
      );
      // Assert
      assert.deepEqual(offenders, []);
    });

    test(`${skill} flow.md Push guards a dirty tracked tree before the rebase`, () => {
      // Arrange
      const push = section(flowOf(skill), 'Push');
      // Act
      const guard = push.indexOf('--untracked-files=no');
      const rebase = push.indexOf('run `pull-rebase`');
      // Assert
      assert.ok(guard >= 0 && guard < rebase, 'guard missing or after pull-rebase');
    });

    test(`${skill} allowed-tools pre-approves no write`, () => {
      // Arrange
      const tools = frontmatter(skill);
      // Act
      const writes =
        /\bgit (push|pull)\b|\bgh api\b|\bglab api\b|\bgh pr comment\b|save_note|__add_|__create_|__update_|_write\b/.test(
          tools
        );
      // Assert
      assert.ok(tools.length > 0 && !writes, 'allowed-tools missing or pre-approves a write');
    });

    test(`${skill} flow.md Spec writes one Write scope line and fetches changed files after the no-fixable check`, () => {
      // Arrange
      const row = `\`${skill.includes('github') ? 'pr-files' : 'mr-files'}\``;
      const flow = flowOf(skill);
      const identify = section(flow, 'Identify');
      const spec = section(flow, 'Spec');
      // Act
      const inIdentify = identify.includes(row);
      const checkAt = spec.indexOf('No fixable item');
      const afterCheck = checkAt >= 0 && spec.indexOf(row) > checkAt;
      const stops = /Stopped: 3: /.test(spec);
      const scope = /one `Write scope:` line outside any fenced block/.test(spec);
      const fixed = /Approach: fixed/.test(spec);
      // Assert
      assert.ok(
        !inIdentify && afterCheck && stops && scope && fixed,
        `${row} misplaced or the spec contract is incomplete`
      );
    });

    test(`${skill} flow.md Spec writes its own Target directory line and fences the Requirement`, () => {
      // Arrange
      const spec = section(flowOf(skill), 'Spec');
      const requirement = skill.includes('github')
        ? /^- Requirement: the PR body and each linked issue, quoted as data, each in a fenced block \(backticks or `~~~`\) whose fence is longer than any run of its own character inside it\.$/m
        : /^- Requirement: the MR description and each `closing-issues` entry, quoted as data, each in a fenced block \(backticks or `~~~`\) whose fence is longer than any run of its own character inside it\.$/m;
      // Act
      const target =
        /^- Target directory: the output of `root` as one `Target directory:` line outside any fenced block, so a quoted one is only a duplicate\.$/m.test(
          spec
        );
      const fenced = requirement.test(spec);
      const unfenced = /^- Requirement: [^\n]*quoted as data\.$/m.test(spec);
      // Assert
      assert.ok(target && fenced && !unfenced, 'Target directory line or fenced Requirement wording missing');
    });

    test(`${skill} flow.md Implement lists an out-of-scope path under Open and never reverts`, () => {
      // Arrange
      const implement = section(flowOf(skill), 'Implement');
      // Act
      const scoped = /outside it is never put in the commit `paths:` and is never reverted/.test(implement);
      const unavailable = /Stopped: 4: cdk:implement-spec unavailable/.test(implement);
      // Assert
      assert.ok(scoped && unavailable, 'scope check or unavailable stop missing from Implement');
    });

    test(`${skill} flow.md replies cite post-push SHAs`, () => {
      // Arrange
      const flow = flowOf(skill);
      const push = section(flow, 'Push');
      const reply = section(flow, 'Reply');
      // Act
      const pushAt = push.indexOf('then `push`');
      const afterPush = pushAt >= 0 && push.indexOf('`log-paths`') > pushAt;
      const replyUses = reply.includes('`log-paths`');
      // Assert
      assert.ok(afterPush && replyUses, 'log-paths missing after push or from Reply');
    });

    test(`${skill} SKILL.md never falls back to general-purpose`, () => {
      // Arrange
      const lines = read(skill, 'SKILL.md')
        .split('\n')
        .filter((line) => /general-purpose/.test(line));
      // Act
      const offenders = lines.filter((line) => !/never[^\n]*general-purpose/.test(line));
      // Assert
      assert.deepEqual(offenders, []);
    });

    test(`${skill} rejects an unsafe branch ref`, () => {
      // Arrange
      const ref = skill.includes('github') ? '<head>' : '<source_branch>';
      const line =
        read(skill, 'references/commands.md')
          .split('\n')
          .find((l) => l.includes('is never substituted into `pull-rebase`')) ?? '';
      const input = section(flowOf(skill), 'Input');
      // Act
      const guarded = line.includes(ref) && line.includes('`pull-rebase`') && line.includes('`push`');
      const stops = /Stopped: 0: unsafe/.test(input);
      // Assert
      assert.ok(guarded && stops, 'unsafe ref guard missing from commands.md or Input');
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
  test('flow.md Spec names mr-files and commands.md defines it', () => {
    // Arrange
    const skill = skills[1];
    const plan = section(read(skill, 'references/flow.md'), 'Spec');
    const commands = read(skill, 'references/commands.md');
    // Act
    const named = plan.includes('`mr-files`');
    const defined = /^\| `mr-files`\s*\|/m.test(commands);
    // Assert
    assert.ok(named && defined, 'mr-files missing from Spec or commands.md');
  });
});
