import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/stop.mjs', import.meta.url));
const PROMPT = fileURLToPath(new URL('../../../../hooks/scripts/user-prompt-submit.mjs', import.meta.url));
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });

test('cli: invalid JSON prints a systemMessage on stdout, nothing on stderr, and exits 0', () => {
  // Arrange
  const input = 'garbage';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).systemMessage, /^cdk stop: .+/);
  assert.equal(r.stderr, '');
});

test('cli: empty stdin prints a systemMessage and exits 0 rather than erroring the turn', () => {
  // Arrange
  const input = '';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).systemMessage, /^cdk stop: .+/);
  assert.equal(r.stderr, '');
});

const dir = mkdtempSync(path.join(tmpdir(), 'cdk-stop-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const sh = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
const hook = (script, event) =>
  spawnSync('node', [script], { input: JSON.stringify(event), encoding: 'utf8', env, timeout: 30_000 });
const turn = (session_id) => hook(PROMPT, { session_id, prompt: 'x', permission_mode: 'plan' });
test('cli: gate blocks the first stop on a dirty tree with the steps in order, then allows the second', () => {
  // Arrange
  sh(['init', '-q']);
  sh(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init']);
  const clean = hook(SCRIPT, { session_id: 's0' });
  turn('s1');
  writeFileSync(path.join(dir, 'a.txt'), 'changed');
  const stop = { session_id: 's1' };
  // Act
  const first = hook(SCRIPT, stop);
  const second = hook(SCRIPT, stop);
  // Assert
  assert.equal(clean.stdout, '');
  const out = JSON.parse(first.stdout);
  assert.equal(out.decision, undefined);
  const context = out.hookSpecificOutput.additionalContext;
  assert.equal(out.hookSpecificOutput.hookEventName, 'Stop');
  assert.match(context, /^End-of-task steps pending: read .+\.md and follow it, in order\.$/);
  const file = context.slice('End-of-task steps pending: read '.length, -' and follow it, in order.'.length);
  assert.match(readFileSync(file, 'utf8'), /README\.md or related docs.*cdk:update-changelog/s);
  assert.doesNotMatch(readFileSync(file, 'utf8'), /cdk:commit-changes/);
  assert.equal(second.stdout, '');
});

test('cli: gate stays silent on a new session with no prompt-hook run in an already dirty tree', () => {
  // Arrange
  const stop = { session_id: 'plan-approved' };
  // Act
  const r = hook(SCRIPT, stop);
  // Assert
  assert.equal(r.stdout, '');
});

test('cli: gate stays silent on a turn that did not change the tree', () => {
  // Arrange
  turn('qa');
  // Act
  const r = hook(SCRIPT, { session_id: 'qa' });
  // Assert
  assert.equal(r.stdout, '');
});

test('cli: gate blocks again after a new edit following a fire', () => {
  // Arrange
  const stop = { session_id: 's2' };
  turn('s2');
  writeFileSync(path.join(dir, 'b0.txt'), 'changed');
  const first = hook(SCRIPT, stop);
  const same = hook(SCRIPT, stop);
  writeFileSync(path.join(dir, 'b.txt'), 'changed');
  // Act
  const again = hook(SCRIPT, stop);
  // Assert
  assert.equal(JSON.parse(first.stdout).hookSpecificOutput.hookEventName, 'Stop');
  assert.equal(same.stdout, '');
  assert.equal(JSON.parse(again.stdout).hookSpecificOutput.hookEventName, 'Stop');
});

test('cli: gate records the tree on the stop_hook_active continuation and stays silent', () => {
  // Arrange
  turn('s3');
  writeFileSync(path.join(dir, 'c0.txt'), 'changed');
  const first = hook(SCRIPT, { session_id: 's3' });
  writeFileSync(path.join(dir, 'c.txt'), 'edited while running the steps');
  // Act
  const cont = hook(SCRIPT, { session_id: 's3', stop_hook_active: true });
  const after = hook(SCRIPT, { session_id: 's3' });
  // Assert
  assert.equal(JSON.parse(first.stdout).hookSpecificOutput.hookEventName, 'Stop');
  assert.equal(cont.stdout, '');
  assert.equal(after.stdout, '');
});
