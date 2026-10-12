import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { readState, statePath, unsafeState, writeState } from '../../../../../hooks/scripts/lib/git-state.mjs';

const dirs = [];
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gs-'));
  dirs.push(dir);
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@t');
  sh(dir, 'config', 'user.name', 't');
  writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  sh(dir, 'add', '-A');
  sh(dir, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: init');
  return dir;
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('unsafeState is false on a normal branch', () => {
  // Arrange
  const dir = repo();
  // Act
  const result = unsafeState(dir);
  // Assert
  assert.equal(result, false);
});

test('unsafeState is true on a detached HEAD', () => {
  // Arrange
  const dir = repo();
  sh(dir, 'checkout', '-q', '--detach');
  // Act
  const result = unsafeState(dir);
  // Assert
  assert.equal(result, true);
});

test('writeState then readState round-trips through the real temp dir', () => {
  // Arrange
  const file = statePath('it-test', mkdtempSync(path.join(tmpdir(), 'gs-sp-')), `s-${process.pid}`);
  dirs.push(file);
  writeState(file, { a: 1 });
  // Act
  const state = readState(file);
  // Assert
  assert.deepEqual(state, { a: 1 });
});
