import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/publish-github-release/scripts/changelog-notes.mjs', import.meta.url)
);
const CL = '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- first\n';

const dirs = [];
const workdir = (changelog) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pgr-'));
  dirs.push(dir);
  if (changelog !== undefined) writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog);
  return dir;
};
const run = (cwd, ...args) => spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8', timeout: 15_000 });

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('changelog-notes CLI', () => {
  test('prints the plan JSON and writes the notes file', () => {
    // Arrange
    const dir = workdir(CL);
    const out = path.join(dir, 'scratch', 'notes.md');
    // Act
    const res = run(dir, 'notes', '--version', 'latest', '--notes-out', out);
    // Assert
    assert.equal(res.status, 0);
    assert.equal(JSON.parse(res.stdout).version, '1.0.0');
    assert.equal(readFileSync(out, 'utf8'), '- first\n');
  });

  test('exits 1 with a JSON error when the changelog is missing', () => {
    // Arrange
    const dir = workdir();
    // Act
    const res = run(dir, 'notes');
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).errors[0].code, 'no-changelog');
  });

  test('exits 2 with a usage line on bad usage', () => {
    // Arrange
    const dir = workdir(CL);
    // Act
    const res = run(dir, 'nope');
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });
});
