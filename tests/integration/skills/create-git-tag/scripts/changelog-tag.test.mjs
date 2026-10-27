import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/create-git-tag/scripts/changelog-tag.mjs', import.meta.url)
);
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 15_000 });

describe('changelog-tag CLI', () => {
  let dir;
  let file;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'changelog-tag-'));
    file = join(dir, 'CHANGELOG.md');
    writeFileSync(
      file,
      '## [Unreleased]\n\n## [0.2.0] - 2026-05-01\n\n### Added\n- x\n\n## [0.1.0] - 2026-04-01\n- y\n'
    );
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('prints the release JSON', () => {
    // Act
    const res = run(file);
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), {
      ok: true,
      version: '0.2.0',
      tag: 'v0.2.0',
      message: 'Release 0.2.0\n\n### Added\n- x'
    });
  });

  test('prints the raw message with --message', () => {
    // Act
    const res = run('--message', file);
    // Assert
    assert.equal(res.status, 0);
    assert.equal(res.stdout, 'Release 0.2.0\n\n### Added\n- x\n');
  });

  test('exits 1 with no-changelog for a missing file', () => {
    // Act
    const res = run(join(dir, 'missing.md'));
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).code, 'no-changelog');
  });

  test('exits 1 with no-dated-version', () => {
    // Arrange
    const only = join(dir, 'ONLY.md');
    writeFileSync(only, '## [Unreleased]\n- x\n');
    // Act
    const res = run(only);
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).code, 'no-dated-version');
  });

  test('exits 2 with no arguments', () => {
    // Act
    const res = run();
    // Assert
    assert.equal(res.status, 2);
  });
});
