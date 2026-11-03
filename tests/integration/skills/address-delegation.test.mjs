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

    test(`${skill} flow.md Verify names the diff row, defined in commands.md; not pre-approved`, () => {
      // Arrange
      const row = skill.includes('github') ? 'pr-diff' : 'mr-diff';
      const verify = section(read(skill, 'references/flow.md'), 'Verify');
      const commands = read(skill, 'references/commands.md');
      // Act
      const named = verify.includes(`\`${row}\``);
      const defined = commands.split('\n').some((line) => line.startsWith(`| \`${row}\``));
      const preApproved = frontmatter(skill).includes('git diff --merge-base');
      // Assert
      assert.ok(
        named && defined && !preApproved,
        `${row} missing from Verify or commands.md, or pre-approved in allowed-tools`
      );
    });

    test(`${skill} flow.md Plan overrides representative-path collapsing`, () => {
      // Arrange
      const plan = section(read(skill, 'references/flow.md'), 'Plan');
      // Act
      const overrides = plan.includes('representative paths');
      // Assert
      assert.ok(overrides, 'representative paths override missing from Plan');
    });

    test(`${skill} flow.md fetches changed files in Plan after the no-fixable check`, () => {
      // Arrange
      const row = `\`${skill.includes('github') ? 'pr-files' : 'mr-files'}\``;
      const flow = read(skill, 'references/flow.md');
      const identify = section(flow, 'Identify');
      const plan = section(flow, 'Plan');
      // Act
      const inIdentify = identify.includes(row);
      const checkAt = plan.indexOf('No fixable item');
      const afterCheck = checkAt >= 0 && plan.indexOf(row) > checkAt;
      const stops = /Stopped: 3: /.test(plan);
      // Assert
      assert.ok(!inIdentify && afterCheck && stops, `${row} misplaced or Stopped: 3 missing`);
    });

    test(`${skill} flow.md replies cite post-push SHAs`, () => {
      // Arrange
      const flow = read(skill, 'references/flow.md');
      const push = section(flow, 'Push');
      const reply = section(flow, 'Reply');
      // Act
      const pushAt = push.indexOf('then `push`');
      const afterPush = pushAt >= 0 && push.indexOf('`log-paths`') > pushAt;
      const replyUses = reply.includes('`log-paths`');
      // Assert
      assert.ok(afterPush && replyUses, 'log-paths missing after push or from Reply');
    });

    test(`${skill} flow.md Implement stops on an unplanned deleted or binary path`, () => {
      // Arrange
      const implement = section(read(skill, 'references/flow.md'), 'Implement');
      // Act
      const named = /deleted[^\n]*binary|binary[^\n]*deleted/.test(implement);
      const stops = /Stopped: 4: /.test(implement);
      // Assert
      assert.ok(named && stops, 'deleted or binary path stop missing from Implement');
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
      const line = read(skill, 'references/commands.md').split('\n')[2];
      const input = section(read(skill, 'references/flow.md'), 'Input');
      // Act
      const guarded = line.includes(ref) && line.includes('`pull-rebase`') && line.includes('`push`');
      const stops = /Stopped: 0: unsafe/.test(input);
      // Assert
      assert.ok(guarded && stops, 'unsafe ref guard missing from commands.md or Input');
    });

    test(`${skill} SKILL.md step 10 says never resolve`, () => {
      // Arrange
      const text = read(skill, 'SKILL.md');
      // Act
      const matched = /^10\. \*\*Reply\.\*\*.*never resolve/m.test(text);
      // Assert
      assert.ok(matched, 'step 10 does not say never resolve');
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
  test('flow.md Plan names mr-files and commands.md defines it', () => {
    // Arrange
    const skill = skills[1];
    const plan = section(read(skill, 'references/flow.md'), 'Plan');
    const commands = read(skill, 'references/commands.md');
    // Act
    const named = plan.includes('`mr-files`');
    const defined = /^\| `mr-files`\s*\|/m.test(commands);
    // Assert
    assert.ok(named && defined, 'mr-files missing from Plan or commands.md');
  });
});
