import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-subagent/scripts/check-agent.mjs');
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 30_000 });
const runLink = (root, ...args) =>
  spawnSync('node', [join(root, 'link.mjs'), ...args], { encoding: 'utf8', timeout: 30_000 });
const BODY = 'Read-only reviewer.\n\n## Task\n\n1. Read the inputs.\n\n## Return\n\n```text\nScore: 1\n```\n';

describe('check-agent CLI', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-agent-'));
    writeFileSync(
      join(root, 'good.md'),
      `---\nname: good\ndescription: Reviews on request.\ntools: Read\n---\n\n${BODY}`
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
    const report = JSON.parse(result.stdout);
    const found = report.errors.map((e) => e.id);
    assert.deepEqual(report.warnings.map((w) => w.id).slice(0, 1), ['unknown-field-near']);
    assert.deepEqual(found, ['description-missing', 'scope-ignored', 'role-missing', 'task-missing', 'return-missing']);
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

describe('check CLI through a symlink', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-link-'));
    symlinkSync(SCRIPT, join(root, 'link.mjs'));
    writeFileSync(
      join(root, 'linked.md'),
      `---\nname: linked\ndescription: Reviews on request.\ntools: Read\n---\n\n${BODY}`
    );
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  test('runs and reports ok for a valid file when started via a symlink', () => {
    // Arrange
    const file = join(root, 'linked.md');
    // Act
    const result = runLink(root, file, '--scope', 'plugin');
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

describe('repo agents', () => {
  const agents = readdirSync(resolve('agents')).filter((name) => name.endsWith('.md'));

  for (const name of agents) {
    test(`${name} passes check-agent`, () => {
      // Arrange
      const file = resolve('agents', name);
      // Act
      const result = run(file, '--scope', 'plugin');
      // Assert
      assert.equal(result.status, 0);
      assert.equal(JSON.parse(result.stdout).ok, true);
    });
  }

  test('only the plain-request agents use Use proactively', () => {
    // Arrange
    const expected = ['change-verifier', 'codebase-explorer', 'task-worker', 'topic-researcher'];
    // Act
    const proactive = agents
      .filter((name) => {
        const text = readFileSync(resolve('agents', name), 'utf8');
        const description = /^description:\s*(.*)$/m.exec(text)?.[1].replace(/^["']/, '');
        return description?.startsWith('Use proactively');
      })
      .map((name) => name.replace(/\.md$/, ''))
      .sort();
    // Assert
    assert.deepEqual(proactive, expected);
  });
});
