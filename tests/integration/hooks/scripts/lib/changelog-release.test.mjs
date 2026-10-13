import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../../hooks/scripts/lib/changelog-release.mjs', import.meta.url));
const REPO = 'https://example.com/a/b';
const CL = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [1.1.0] - 2026-02-01',
  '',
  '- added b',
  '',
  '## [1.0.0] - 2026-01-01',
  '',
  '- first',
  ''
].join('\n');

const dirs = [];
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
const tagged = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cr-'));
  dirs.push(dir);
  git(dir, 'init', '-q');
  git(
    dir,
    '-c',
    'user.email=t@t',
    '-c',
    'user.name=t',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-q',
    '--allow-empty',
    '-m',
    'chore: init'
  );
  git(dir, 'tag', '1.0.0');
  writeFileSync(path.join(dir, 'CHANGELOG.md'), CL);
  return dir;
};
const run = (cwd, args) => spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8', timeout: 30_000 });

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('changelog-release CLI', () => {
  test('plan prints the tag and writes the notes file', () => {
    // Arrange
    const dir = tagged();
    const notes = path.join(dir, 'out', 'notes.md');
    // Act
    const res = run(dir, ['plan', '--repo-url', REPO, '--notes-out', notes]);
    // Assert
    const out = JSON.parse(res.stdout);
    assert.equal(res.status, 0);
    assert.equal(out.tag, '1.1.0');
    assert.equal(readFileSync(notes, 'utf8'), out.notes);
    assert.match(out.notes, /compare\/1\.0\.0\.\.\.1\.1\.0/);
  });

  test('plan exits 1 with no-changelog for a missing changelog file', () => {
    // Arrange
    const dir = tagged();
    // Act
    const res = run(dir, ['plan', '--changelog', 'missing.md']);
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).errors[0].code, 'no-changelog');
  });

  test('exits 2 with usage when no command is given', () => {
    // Arrange
    const dir = tagged();
    // Act
    const res = run(dir, []);
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage:/);
  });
});
