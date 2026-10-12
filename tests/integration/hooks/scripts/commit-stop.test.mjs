import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/commit-stop.mjs', import.meta.url));
const dirs = [];
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

// Temp repo with one commit and a dirty tree.
function dirtyRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cs-'));
  dirs.push(dir);
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@t');
  sh(dir, 'config', 'user.name', 't');
  writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  sh(dir, 'add', '-A');
  sh(dir, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: init');
  writeFileSync(path.join(dir, 'a.txt'), 'b\n');
  return dir;
}
const run = (dir, input = {}) =>
  spawnSync('node', [SCRIPT], {
    input: JSON.stringify({ session_id: `t-${path.basename(dir)}`, ...input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8'
  });

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('dirty tree without the marker blocks and asks for cdk:commit-changes', () => {
  // Arrange
  const dir = dirtyRepo();
  // Act
  const out = JSON.parse(run(dir).stdout);
  // Assert
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /cdk:commit-changes/);
});

test('ship-release marker skips the commit instruction', () => {
  // Arrange
  const dir = dirtyRepo();
  writeFileSync(path.join(dir, sh(dir, 'rev-parse', '--git-path', 'cdk-ship-release')), '');
  // Act
  const out = JSON.parse(run(dir).stdout);
  // Assert
  assert.equal(out.decision, undefined);
  assert.match(out.systemMessage, /ship-release pending/);
});

test('clean tree reports no Git changes', () => {
  // Arrange
  const dir = dirtyRepo();
  sh(dir, 'checkout', '--', 'a.txt');
  // Act
  const out = JSON.parse(run(dir).stdout);
  // Assert
  assert.equal(out.systemMessage, '⏺ No Git changes to commit');
});

test('a second run reports the unfulfilled commit instruction as an error', () => {
  // Arrange
  const dir = dirtyRepo();
  run(dir);
  // Act
  const second = run(dir, { stop_hook_active: false });
  // Assert
  assert.equal(second.stdout, JSON.stringify({ systemMessage: '❌ Git changes error' }));
});

test('a detached HEAD gets no commit instruction', () => {
  // Arrange
  const dir = dirtyRepo();
  sh(dir, 'checkout', '-q', '--detach');
  // Act
  const result = run(dir);
  // Assert
  assert.equal(result.stdout, '');
});

test('invalid stdin prints nothing', () => {
  // Arrange
  const dir = dirtyRepo();
  // Act
  const result = spawnSync('node', [SCRIPT], {
    input: 'not json',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8'
  });
  // Assert
  assert.equal(result.stdout, '');
});
