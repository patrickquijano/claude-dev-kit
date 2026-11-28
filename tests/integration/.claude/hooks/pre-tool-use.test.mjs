import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../.claude/hooks/pre-tool-use.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const run = (command) =>
  spawnSync('node', [SCRIPT], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    timeout: 15_000
  });

test('cli: a 73-char header exits 2 with one stderr line', () => {
  // Arrange
  const command = `git commit -m "feat: ${'a'.repeat(67)}"`;
  // Act
  const r = run(command);
  // Assert
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^cdk pre-tool-use: git commit blocked: commit header is 73 chars, max 72 .+\n$/);
});

test('cli: a 60-char header exits 0 with no output', () => {
  // Arrange
  const command = `git commit -m "feat: ${'a'.repeat(54)}"`;
  // Act
  const r = run(command);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
});

test('cli: a heredoc message with a long header exits 2', () => {
  // Arrange
  const command = `git commit -m "$(cat <<'EOF'\nfeat: ${'a'.repeat(70)}\nEOF\n)"`;
  // Act
  const r = run(command);
  // Assert
  assert.equal(r.status, 2);
});

test('cli: a hook bypass flag exits 2', () => {
  // Arrange
  const command = 'git commit --no-verify -m "fix: a"';
  // Act
  const r = run(command);
  // Assert
  assert.equal(r.status, 2);
  assert.match(r.stderr, /forbidden/);
});

test('cli: invalid JSON exits 2 with one stderr line', () => {
  // Arrange
  const input = 'not json';
  // Act
  const r = spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });
  // Assert
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^cdk pre-tool-use \(commit gate\): .+\n$/);
});
