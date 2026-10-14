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

const PROMPT_SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/user-prompt-submit.mjs', import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'cdk-stop-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const sh = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
const hook = (script, event) =>
  spawnSync('node', [script], { input: JSON.stringify(event), encoding: 'utf8', env, timeout: 30_000 });
test('cli: gate blocks the first stop after files changed with the steps in order, then allows the second', () => {
  // Arrange
  sh(['init', '-q']);
  sh(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init']);
  hook(PROMPT_SCRIPT, { session_id: 's1', prompt: 'Fix X', permission_mode: 'default' });
  writeFileSync(path.join(dir, 'a.txt'), 'changed');
  const stop = { session_id: 's1', transcript_path: path.join(dir, 'none.jsonl') };
  // Act
  const first = hook(SCRIPT, stop);
  const second = hook(SCRIPT, stop);
  // Assert
  const out = JSON.parse(first.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /README\.md or related docs.*cdk:update-changelog.*cdk:commit-changes/s);
  assert.equal(second.stdout, '');
});

test('cli: gate blocks regardless of the transcript, then allows', () => {
  // Arrange
  hook(PROMPT_SCRIPT, { session_id: 's2', prompt: 'Fix Y', permission_mode: 'default' });
  writeFileSync(path.join(dir, 'b.txt'), 'changed');
  const file = path.join(dir, 't.jsonl');
  writeFileSync(file, JSON.stringify({ type: 'user', message: { content: 'Fix Y' } }));
  const stop = { session_id: 's2', transcript_path: file };
  // Act
  const first = hook(SCRIPT, stop);
  const second = hook(SCRIPT, stop);
  // Assert
  assert.equal(JSON.parse(first.stdout).decision, 'block');
  assert.equal(second.stdout, '');
});

test('cli: gate stays silent when the turn changed no files', () => {
  // Arrange
  hook(PROMPT_SCRIPT, { session_id: 's3', prompt: 'What is X?', permission_mode: 'default' });
  // Act
  const r = hook(SCRIPT, { session_id: 's3' });
  // Assert
  assert.equal(r.stdout, '');
});
