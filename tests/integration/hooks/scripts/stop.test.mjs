import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/stop.mjs', import.meta.url));
const dirs = [];
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

// Temp repo with one commit holding a text file the format-lint step does not cover.
function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'stop-'));
  dirs.push(dir);
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@t');
  sh(dir, 'config', 'user.name', 't');
  writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  sh(dir, 'add', '-A');
  sh(dir, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: init');
  return dir;
}
const run = (dir, input) =>
  spawnSync('node', [SCRIPT], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('a clean repo prints one JSON object reporting no Git changes', () => {
  // Arrange
  const dir = repo();
  // Act
  const result = run(dir, JSON.stringify({ session_id: `st-${process.pid}-1` }));
  // Assert
  assert.match(JSON.parse(result.stdout).systemMessage, /No Git changes to commit/);
});

test('a dirty repo ends in the commit step block', () => {
  // Arrange
  const dir = repo();
  writeFileSync(path.join(dir, 'a.txt'), 'b\n');
  // Act
  const result = run(dir, JSON.stringify({ session_id: `st-${process.pid}-2` }));
  // Assert
  const out = JSON.parse(result.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /cdk:commit-changes/);
});

test('invalid stdin prints nothing and exits 0', () => {
  // Arrange
  const dir = repo();
  // Act
  const result = run(dir, 'not json');
  // Assert
  assert.equal(result.stdout, '');
  assert.equal(result.status, 0);
});
