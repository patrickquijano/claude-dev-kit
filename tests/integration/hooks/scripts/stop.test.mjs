import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/stop.mjs', import.meta.url));
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });

test('cli: invalid JSON prints one stderr line, nothing on stdout, and exits 1', () => {
  // Arrange
  const input = 'garbage';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^cdk stop: .+\n$/);
});

test('cli: empty stdin exits 1 rather than blocking the turn', () => {
  // Arrange
  const input = '';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
});

const dir = mkdtempSync(path.join(tmpdir(), 'cdk-stop-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const sh = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
const hook = (script, event) =>
  spawnSync('node', [script], { input: JSON.stringify(event), encoding: 'utf8', env, timeout: 30_000 });
test('cli: gate blocks the first stop on a dirty tree with the steps in order, then allows the second', () => {
  // Arrange
  sh(['init', '-q']);
  sh(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init']);
  const clean = hook(SCRIPT, { session_id: 's0' });
  writeFileSync(path.join(dir, 'a.txt'), 'changed');
  const stop = { session_id: 's1' };
  // Act
  const first = hook(SCRIPT, stop);
  const second = hook(SCRIPT, stop);
  // Assert
  assert.equal(clean.stdout, '');
  const out = JSON.parse(first.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /README\.md or related docs.*cdk:update-changelog.*cdk:commit-changes/s);
  assert.equal(second.stdout, '');
});

test('cli: gate blocks a new session with no prompt-hook run, as after plan approval with cleared context', () => {
  // Arrange
  const stop = { session_id: 'plan-approved' };
  // Act
  const r = hook(SCRIPT, stop);
  // Assert
  assert.equal(JSON.parse(r.stdout).decision, 'block');
});

test('cli: gate blocks again after a new edit following a fire', () => {
  // Arrange
  const stop = { session_id: 's2' };
  const first = hook(SCRIPT, stop);
  const same = hook(SCRIPT, stop);
  writeFileSync(path.join(dir, 'b.txt'), 'changed');
  // Act
  const again = hook(SCRIPT, stop);
  // Assert
  assert.equal(JSON.parse(first.stdout).decision, 'block');
  assert.equal(same.stdout, '');
  assert.equal(JSON.parse(again.stdout).decision, 'block');
});

test('cli: gate records the tree on the stop_hook_active continuation and stays silent', () => {
  // Arrange
  const first = hook(SCRIPT, { session_id: 's3' });
  writeFileSync(path.join(dir, 'c.txt'), 'edited while running the steps');
  // Act
  const cont = hook(SCRIPT, { session_id: 's3', stop_hook_active: true });
  const after = hook(SCRIPT, { session_id: 's3' });
  // Assert
  assert.equal(JSON.parse(first.stdout).decision, 'block');
  assert.equal(cont.stdout, '');
  assert.equal(after.stdout, '');
});
