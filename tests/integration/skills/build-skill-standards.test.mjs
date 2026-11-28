import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills', 'build-skill');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const hasLine = (text, pattern) => text.split('\n').some((line) => pattern.test(line));

describe('build-skill standards', () => {
  const rules = read('references/rules.md');
  const skill = read('SKILL.md');
  const evals = read('references/evals.md');
  const template = read('assets/SKILL.template.md');

  test('rules.md limits description to 400 chars and the listing to 400', () => {
    // Arrange
    const description = /^- `description`: ≤400 chars \(count it;/;
    const whenToUse = /^- `when_to_use`: best omitted; description plus `when_to_use` stays ≤400 chars\.$/;
    // Act
    const found = [hasLine(rules, description), hasLine(rules, whenToUse)];
    // Assert
    assert.deepEqual(found, [true, true]);
  });

  test('rules.md no longer allows 200 or 1,536 chars', () => {
    // Arrange
    const stale = /^- Descriptions over 200 chars|≤1,536/;
    // Act
    const found = hasLine(rules, stale);
    // Assert
    assert.equal(found, false);
  });

  test('the template comment says ≤400 chars and keeps the side-effect clause', () => {
    // Arrange
    const limit =
      /# ≤400 chars, no skill names; side effects that must never auto-load → add Use only when the user explicitly asks to <action>\. just before Not for$/;
    // Act
    const found = hasLine(template, limit);
    // Assert
    assert.equal(found, true);
  });

  test('SKILL.md stops with no scope, even under --yes', () => {
    // Arrange
    const scope =
      /^- Create: ask the scope \(user, project, plugin\) when the input does not name it; never guess it, even under `--yes`: no answer → `Result: stopped`, `Stopped: 1: no scope`/;
    // Act
    const found = hasLine(skill, scope);
    // Assert
    assert.equal(found, true);
  });

  test('SKILL.md asks Apply | Keep for an over-400 description and keeps it under --yes', () => {
    // Arrange
    const ask =
      /^- Update and improve: an existing description plus `when_to_use` over 400 chars → show the before\/after rewrite and ask `Apply \| Keep` before building the spec; `--yes` keeps it unchanged and lists it under `Open:`;/;
    // Act
    const found = hasLine(skill, ask);
    // Assert
    assert.equal(found, true);
  });

  test('SKILL.md runs skills-ref only when present and never blocks', () => {
    // Arrange
    const step =
      /^ {3}d\. When `skills-ref` is on PATH, also run `skills-ref validate <skill-dir>` and add its errors to the fix list; absent → record `skills-ref: skipped`, never block\.$/;
    const tool = /^allowed-tools: .*Bash\(skills-ref validate \*\)$/;
    // Act
    const found = [hasLine(skill, step), hasLine(skill, tool)];
    // Assert
    assert.deepEqual(found, [true, true]);
  });

  test('SKILL.md stays under 500 lines', () => {
    // Arrange
    const lines = skill.split('\n').length;
    // Act
    const under = lines < 500;
    // Assert
    assert.ok(under, `${lines} lines`);
  });

  test('evals.md runs a no-skill baseline first and lists the new cases', () => {
    // Arrange
    const baseline =
      /^0\. Run one model without the skill as a baseline, then write minimal instructions, then iterate\.$/;
    const ids = [
      'scope-asked',
      'scope-unknown-yes-stops',
      'long-description-rewrite-ask',
      'long-description-yes-keeps',
      'skills-ref-optional',
      'gerund-name-ok',
      'synced-folder-rejected'
    ];
    // Act
    const found = [
      hasLine(evals, baseline),
      ...ids.map((id) => evals.split('\n').some((line) => line.startsWith(`| ${id} |`)))
    ];
    // Assert
    assert.deepEqual(found, Array(8).fill(true));
  });
});
