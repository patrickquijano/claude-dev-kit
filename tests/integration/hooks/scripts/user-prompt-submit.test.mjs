import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/user-prompt-submit.mjs', import.meta.url));
const dirs = [];
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const dir = (prefix) => {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  dirs.push(d);
  return d;
};
function repo() {
  const d = dir('te-');
  sh(d, 'init', '-q', '-b', 'main');
  sh(d, 'config', 'user.email', 't@t');
  sh(d, 'config', 'user.name', 't');
  writeFileSync(path.join(d, 'a.txt'), 'a\n');
  sh(d, 'add', '-A');
  sh(d, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: init');
  return d;
}
const run = (cwd, input) =>
  spawnSync(process.execPath, [SCRIPT], {
    input,
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
    encoding: 'utf8',
    timeout: 15_000
  });
const prompt = JSON.stringify({ permission_mode: 'default', prompt: 'Fix X' });
const BIG = 'Implement X across multiple files\n- a\n- b\n- c';

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

test('cli: a task prompt prints plan-mode context', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, prompt);
  // Assert
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /whether to enter plan mode/);
});

test('cli: a slash-command prompt prints nothing', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'default', prompt: '/cdk:ship-release' }));
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: invalid JSON prints one stderr line, nothing on stdout, and exits 1', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, 'garbage');
  // Assert
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^cdk user-prompt-submit: .+\n$/);
});

test('cli: a JSON array exits 1 with no stdout', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, '[1]');
  // Assert
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
});

test('cli: a question in default mode asks about plan mode', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'default', prompt: 'What does X do?' }));
  // Assert
  const out = JSON.parse(r.stdout);
  assert.equal(out.systemMessage, undefined);
  assert.match(out.hookSpecificOutput.additionalContext, /whether to enter plan mode/);
});

test('cli: a task-notification prompt asks nothing', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(
    d,
    JSON.stringify({ permission_mode: 'default', prompt: '<task-notification>\n<task-id>a1</task-id>' })
  );
  // Assert
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /whether to enter plan mode/);
});

test('cli: a question in plan mode prints nothing', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'plan', prompt: 'What does X do?' }));
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: #noplan in plan mode prints the exit instruction', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'plan', prompt: 'What does X do? #noplan' }));
  // Assert
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /ExitPlanMode/);
});

test('cli: a large change asks about plan mode', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'default', prompt: BIG }));
  // Assert
  const out = JSON.parse(r.stdout);
  assert.equal(out.systemMessage, undefined);
  assert.match(out.hookSpecificOutput.additionalContext, /whether to enter plan mode/);
});
