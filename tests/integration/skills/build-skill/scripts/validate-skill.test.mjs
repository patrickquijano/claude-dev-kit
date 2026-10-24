import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-skill/scripts/validate-skill.mjs');
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 30_000 });

const runLink = (root, ...args) =>
  spawnSync('node', [join(root, 'link.mjs'), ...args], { encoding: 'utf8', timeout: 30_000 });

describe('validate-skill CLI', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'validate-skill-'));
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
    const linker = join(root, 'link-other');
    mkdirSync(linker);
    writeFileSync(
      join(linker, 'SKILL.md'),
      '---\nname: link-other\ndescription: Links out. Use when asked.\n---\n\n## Files\n\n- See `${CLAUDE_SKILL_DIR}/../other/x.md`.\n\n## Output\n\n```text\nResult: done\n```\n'
    );
    const dots = join(root, 'dot-files');
    mkdirSync(dots);
    writeFileSync(
      join(dots, 'SKILL.md'),
      '---\nname: dot-files\ndescription: Checks dotfiles. Use when asked.\n---\n\n## Output\n\n```text\nResult: done\n```\n'
    );
    writeFileSync(join(dots, '.DS_Store'), 'x\n');
    writeFileSync(join(dots, '.env'), 'x\n');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  test('flags .env but ignores .DS_Store', () => {
    // Arrange
    const dir = join(root, 'dot-files');
    // Act
    const result = run(dir, '--kind', 'task');
    const report = JSON.parse(result.stdout);
    // Assert
    assert.equal(result.status, 1);
    assert.deepEqual(
      report.errors.filter((e) => e.id === 'dotfile').map((e) => e.file),
      ['.env']
    );
    assert.equal(
      [...report.errors, ...report.warnings].some((f) => f.file === '.DS_Store'),
      false
    );
  });

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

  test('exits 1 with link-outside for a link into another skill', () => {
    // Arrange
    const dir = join(root, 'link-other');
    // Act
    const result = run(dir, '--kind', 'task');
    const report = JSON.parse(result.stdout);
    // Assert
    assert.equal(result.status, 1);
    assert.deepEqual(
      report.errors.map((e) => e.id),
      ['link-outside']
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

describe('check CLI through a symlink', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-link-'));
    symlinkSync(SCRIPT, join(root, 'link.mjs'));
    mkdirSync(join(root, 'linked'));
    writeFileSync(
      join(root, 'linked', 'SKILL.md'),
      '---\nname: linked\ndescription: Reviews code. Use when asked.\n---\n\n# Review\n\n## Files\n\n- For rules, see `${CLAUDE_SKILL_DIR}/references/rules.md`.\n\n## Output\n\n```text\nResult: done\n```\n'
    );
    mkdirSync(join(root, 'linked', 'references'));
    writeFileSync(join(root, 'linked', 'references', 'rules.md'), '# Rules\n');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  test('runs and reports ok for a valid file when started via a symlink', () => {
    // Arrange
    const file = join(root, 'linked');
    // Act
    const result = runLink(root, file);
    // Assert
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
  });

  test('exits 2 with a usage error when started via a symlink without a path', () => {
    // Arrange
    const args = [];
    // Act
    const result = runLink(root, ...args);
    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage/);
  });
});
