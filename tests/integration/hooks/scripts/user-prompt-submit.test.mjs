import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
// PATH holds only git, so Graphify is never configured.
const emptyBin = dir('te-bin-');
symlinkSync(execFileSync('which', ['git'], { encoding: 'utf8' }).trim(), path.join(emptyBin, 'git'));
const run = (cwd, input) =>
  spawnSync(process.execPath, [SCRIPT], {
    input,
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, PATH: emptyBin },
    encoding: 'utf8',
    timeout: 15_000
  });
const prompt = JSON.stringify({ permission_mode: 'default', prompt: 'Fix X' });
const BIG = 'Implement X across multiple files\n- a\n- b\n- c';

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

test('cli: a clean repo prints the commit context', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, prompt);
  // Assert
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /cdk:commit-changes/);
});

test('cli: a dirty repo prints the commit context', () => {
  // Arrange
  const d = repo();
  writeFileSync(path.join(d, 'a.txt'), 'b\n');
  // Act
  const r = run(d, prompt);
  // Assert
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /cdk:commit-changes/);
});

test('cli: the ship-release marker removes the commit part', () => {
  // Arrange
  const d = repo();
  writeFileSync(path.join(d, '.git', 'cdk-ship-release'), '');
  // Act
  const r = run(d, prompt);
  // Assert
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /cdk:commit-changes/);
});

test('cli: a non-git directory prints the docs step but no commit step', () => {
  // Arrange
  const d = dir('te-none-');
  // Act
  const r = run(d, prompt);
  // Assert
  assert.equal(r.status, 0);
  assert.match(r.stdout, /README\.md or related docs/);
  assert.doesNotMatch(r.stdout, /cdk:commit-changes/);
});

test('cli: a slash-command prompt prints the end-of-task steps', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'default', prompt: '/cdk:ship-release' }));
  // Assert
  assert.match(r.stdout, /cdk:commit-changes/);
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
  assert.match(out.systemMessage, /^Plan mode: asking \(context\)/);
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

test('cli: a question in plan mode prints the end-of-task steps only', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'plan', prompt: 'What does X do?' }));
  // Assert
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /cdk:commit-changes/);
  assert.doesNotMatch(ctx, /ExitPlanMode|whether to enter plan mode/);
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

test('cli: a large change asks about plan mode before the commit step', () => {
  // Arrange
  const d = repo();
  // Act
  const r = run(d, JSON.stringify({ permission_mode: 'default', prompt: BIG }));
  // Assert
  const out = JSON.parse(r.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(out.systemMessage, /^Plan mode: asking/);
  assert.ok(ctx.indexOf('whether to enter plan mode') < ctx.indexOf('cdk:commit-changes'));
});
