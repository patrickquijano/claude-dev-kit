import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/setup-devcontainer/scripts/check-json.mjs', import.meta.url)
);

describe('check-json CLI', () => {
  let dir;
  let project;
  let outside;
  const run = (...args) =>
    spawnSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: project }
    });
  before(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'check-json-')));
    project = join(dir, 'project');
    outside = join(dir, 'outside');
    mkdirSync(project);
    mkdirSync(outside);
    writeFileSync(join(project, 'valid.json'), '{"name":"x"}');
    writeFileSync(join(project, 'invalid.json'), '{"secret": oops,}');
    writeFileSync(join(outside, 'valid.json'), '{"name":"x"}');
    symlinkSync(join(outside, 'valid.json'), join(project, 'link.json'));
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('exits 0 with no output for a valid file inside the project', () => {
    // Act
    const res = run(join(project, 'valid.json'));
    // Assert
    assert.equal(res.status, 0);
    assert.equal(res.stderr, '');
  });

  test('exits 1 for invalid JSON without printing its contents', () => {
    // Act
    const res = run(join(project, 'invalid.json'));
    // Assert
    assert.equal(res.status, 1);
    assert.ok(!res.stderr.includes('secret'));
  });

  test('exits 1 for a missing file inside the project', () => {
    // Act
    const res = run(join(project, 'missing.json'));
    // Assert
    assert.equal(res.status, 1);
  });

  test('exits 1, not 2, for a missing file when the project root is a symlink', () => {
    // Arrange
    const alias = join(dir, 'alias');
    symlinkSync(project, alias);
    // Act
    const res = spawnSync('node', [SCRIPT, join(alias, 'missing.json')], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: alias }
    });
    // Assert
    assert.equal(res.status, 1);
  });

  test('exits 2 when CLAUDE_PROJECT_DIR does not exist', () => {
    // Act
    const res = spawnSync('node', [SCRIPT, join(dir, 'gone', 'x.json')], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: join(dir, 'gone') }
    });
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /project directory not found/);
  });

  test('exits 2 for a relative path', () => {
    // Act
    const res = run('valid.json');
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });

  test('exits 2 for a path outside the project', () => {
    // Act
    const res = run(join(outside, 'valid.json'));
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /outside the project/);
  });

  test('exits 2 for a symlink that escapes the project', () => {
    // Act
    const res = run(join(project, 'link.json'));
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /outside the project/);
  });
});
