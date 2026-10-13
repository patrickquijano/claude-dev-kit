import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-skill/scripts/check-skill.mjs');
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 30_000 });

describe('check-skill CLI', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-skill-'));
    const good = join(root, 'review-code');
    mkdirSync(join(good, 'references'), { recursive: true });
    writeFileSync(
      join(good, 'SKILL.md'),
      '---\nname: review-code\ndescription: Reviews code. Use when asked.\n---\n\n# Review\n\n## Files\n\n- For rules, see `${CLAUDE_SKILL_DIR}/references/rules.md`.\n\n## Output\n\n```text\nResult: done\n```\n'
    );
    writeFileSync(join(good, 'references', 'rules.md'), '# Rules\n');
    const bad = join(root, 'code-reviewer');
    mkdirSync(bad);
    writeFileSync(
      join(bad, 'SKILL.md'),
      '---\nname: code-reviewer\ndescription: x\ncolour: red\n---\n\n- A: !`git status`\n'
    );
    writeFileSync(join(bad, 'orphan.md'), 'x\n');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  test('exits 0 with ok:true for a valid skill', () => {
    // Arrange
    const dir = join(root, 'review-code');
    // Act
    const result = run(dir, '--kind', 'task');
    // Assert
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
  });

  test('exits 1 listing the broken-skill findings', () => {
    // Arrange
    const dir = join(root, 'code-reviewer');
    // Act
    const result = run(dir);
    const report = JSON.parse(result.stdout);
    // Assert
    assert.equal(result.status, 1);
    assert.deepEqual(report.errors.map((e) => e.id).sort(), [
      'injection-fallback',
      'layout',
      'navigation-missing',
      'orphan',
      'unknown-field'
    ]);
    assert.deepEqual(
      report.warnings.map((w) => w.id),
      ['name-actor']
    );
  });

  test('exits 2 on bad usage', () => {
    // Arrange
    const args = ['--kind', 'nope'];
    // Act
    const result = run(...args);
    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage/);
  });

  test('exits 0 when run on skills/build-skill itself', () => {
    // Arrange
    const dir = resolve('skills/build-skill');
    // Act
    const result = run(dir, '--kind', 'task');
    // Assert
    assert.equal(result.status, 0, result.stdout);
  });
});
