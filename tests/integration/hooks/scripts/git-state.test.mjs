import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import {
  pushed,
  readState,
  statePath,
  treeSnapshot,
  unsafeState,
  writeState
} from '../../../../hooks/scripts/git-state.mjs';

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

test('treeSnapshot reports a clean repo as not dirty with the HEAD sha', () => {
  // Arrange
  const dir = repo();
  // Act
  const snap = treeSnapshot(dir);
  // Assert
  assert.equal(snap.dirty, false);
  assert.equal(snap.head, sh(dir, 'rev-parse', 'HEAD'));
});

test('treeSnapshot fingerprint changes with an edit and with an untracked file', () => {
  // Arrange
  const dir = repo();
  writeFileSync(path.join(dir, 'a.txt'), 'b\n');
  const edited = treeSnapshot(dir).fp;
  writeFileSync(path.join(dir, 'new.txt'), 'n\n');
  // Act
  const withUntracked = treeSnapshot(dir).fp;
  // Assert
  assert.notEqual(edited, withUntracked);
});

test('treeSnapshot ignores excluded paths', () => {
  // Arrange
  const dir = repo();
  writeFileSync(path.join(dir, 'a.txt'), 'b\n');
  // Act
  const snap = treeSnapshot(dir, { exclude: ['a.txt'] });
  // Assert
  assert.equal(snap.dirty, false);
});

test('treeSnapshot returns null outside a git repository', () => {
  // Arrange
  const dir = mkdtempSync(path.join(tmpdir(), 'gs-none-'));
  dirs.push(dir);
  // Act
  const snap = treeSnapshot(dir);
  // Assert
  assert.equal(snap, null);
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

test('pushed is true in a repo with no remote', () => {
  // Arrange
  const dir = repo();
  // Act
  const result = pushed(dir);
  // Assert
  assert.equal(result, true);
});

test('pushed is false when a remote exists but nothing was pushed', () => {
  // Arrange
  const dir = repo();
  sh(dir, 'remote', 'add', 'origin', path.join(dir, 'nowhere'));
  // Act
  const result = pushed(dir);
  // Assert
  assert.equal(result, false);
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
