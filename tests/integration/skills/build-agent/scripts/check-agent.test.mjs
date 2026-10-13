import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-agent/scripts/check-agent.mjs');
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 30_000 });
const BODY = 'Read-only reviewer.\n\n## Task\n\n1. Read the inputs.\n\n## Return\n\n```text\nScore: 1\n```\n';

describe('check-agent CLI', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-agent-'));
    writeFileSync(
      join(root, 'good.md'),
      `---\nname: good\ndescription: Use proactively to review.\ntools: Read\n---\n\n${BODY}`
    );
    writeFileSync(join(root, 'bad.md'), '---\nname: bad\ncolour: red\npermissionMode: plan\n---\n\n# Heading\n');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  test('exits 0 with ok:true for a valid agent', () => {
    // Arrange
    const file = join(root, 'good.md');
    // Act
    const result = run(file, '--scope', 'plugin');
    // Assert
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
  });

  test('exits 1 listing the findings of a broken agent', () => {
    // Arrange
    const file = join(root, 'bad.md');
    // Act
    const result = run(file, '--scope', 'plugin');
    // Assert
    assert.equal(result.status, 1);
    const found = JSON.parse(result.stdout).errors.map((e) => e.id);
    assert.deepEqual(found, [
      'unknown-field',
      'description-missing',
      'scope-ignored',
      'role-missing',
      'task-missing',
      'return-missing'
    ]);
  });

  test('exits 2 with usage when no file is given', () => {
    // Arrange
    const args = [];
    // Act
    const result = run(...args);
    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage/);
  });

  test('exits 2 when the file does not exist', () => {
    // Arrange
    const file = join(root, 'missing.md');
    // Act
    const result = run(file);
    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /not found/);
  });
});
