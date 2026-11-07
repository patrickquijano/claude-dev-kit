import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const mdFiles = (skill) => walk(join(root, 'skills', skill)).filter((p) => p.endsWith('.md'));
const skillMd = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');

describe('review-code-changes policy', () => {
  test('keeps fix memory in auto memory only', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const rule = text.includes('Claude auto memory');
    const kind = text.includes('cdk-fix-review-');
    const guard = text.includes('never write under `${CLAUDE_SKILL_DIR}`');
    // Assert
    assert.ok(rule, 'auto-memory rule missing');
    assert.ok(kind, 'cdk-fix-review- name missing');
    assert.ok(guard, 'skill-dir write guard missing');
  });

  test('runs no formatter or linter', () => {
    // Arrange
    const forbidden = /prettier|eslint|markdownlint|--fix/;
    // Act
    const hits = mdFiles('review-code-changes').filter((p) => forbidden.test(readFileSync(p, 'utf8')));
    // Assert
    assert.deepEqual(hits, []);
  });

  test('waives negligible findings', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const rule = text.includes('Waived:') && /negligible/i.test(text);
    // Assert
    assert.ok(rule);
  });

  test('asks to extend at the round cap', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const ask = text.includes('Extend 3 more rounds | Stop');
    // Assert
    assert.ok(ask);
  });

  test('treats an implement-spec stop other than needs input as a cap stop', () => {
    // Arrange
    const skill = skillMd('review-code-changes');
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const input = 'whose reason is `needs input` or `no input`, or a `Result: cancelled`, becomes `Result: stopped`';
    const skillRule = new RegExp(`^- Fixes go through .*${input}.*any other \`Stopped:\` is a cap stop`, 'm').test(
      skill
    );
    const fixRule = new RegExp(
      `^Write the distinct goal files.*${input}.*any other \`Stopped:\` is a cap stop`,
      'm'
    ).test(fix);
    const stale = /Its `Stopped:` (becomes|→) `Result: stopped`/.test(skill + fix);
    // Assert
    assert.ok(skillRule, 'SKILL.md cap-stop rule missing');
    assert.ok(fixRule, 'fix.md cap-stop rule missing');
    assert.equal(stale, false);
  });

  test('asks no approval question', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const rule = text.includes('asks no approval question');
    // Assert
    assert.ok(rule, 'no-approval rule missing');
  });

  test('names the test file in each fix spec goal', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const rule = text.includes('test file');
    // Assert
    assert.ok(rule, 'test file in goals missing');
  });
});

describe('implement-spec spawn rule', () => {
  test('names the file threshold and the disjoint-group parallel spawn', () => {
    // Arrange
    const text = skillMd('implement-spec');
    // Act
    const threshold =
      text.includes('At most 3 → apply the change inline') &&
      text.includes('More than 3 → spawn one `cdk:plan-implementer`');
    const parallel = text.includes('no shared file') && text.includes('max 4 in one turn');
    // Assert
    assert.ok(threshold, 'threshold missing');
    assert.ok(parallel, 'parallel rule missing');
  });

  test('skips the approach ask when only one approach is workable', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills', 'implement-spec', 'references', 'plan.md'), 'utf8');
    // Act
    const rule = text.includes('skip the ask');
    // Assert
    assert.ok(rule, 'skip-the-ask rule missing');
  });

  test('splits the baseline into a git step and a no-git step', () => {
    // Arrange
    const text = skillMd('implement-spec');
    // Act
    const git = /^1b\. \*\*Baseline \(git\)\.\*\*/m.test(text);
    const noGit = /^1c\. \*\*Baseline \(no git\)\.\*\*/m.test(text);
    // Assert
    assert.ok(git, 'step 1b missing');
    assert.ok(noGit, 'step 1c missing');
  });
});
