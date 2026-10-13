import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/pre-tool-use.mjs', import.meta.url));
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });

test('cli: invalid JSON fails closed with exit 2 and one stderr line', () => {
  // Arrange
  const input = 'garbage';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^cdk pre-tool-use: .+\n$/);
});

test('cli: a JSON array fails closed with exit 2', () => {
  // Arrange
  const input = '[1]';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 2);
});

const bash = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: process.cwd() });

test('cli: git push --force exits 2 with the guard reason', () => {
  // Arrange
  const input = bash('git push --force');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^git-guard: force push is forbidden/);
});

test('cli: git reset --hard prints the ask JSON and exits 0', () => {
  // Arrange
  const input = bash('git reset --hard');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('cli: git status exits 0 with no output', () => {
  // Arrange
  const input = bash('git status');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: a tag push exits 0 with no output', () => {
  // Arrange
  const input = bash('git push origin v1.0.0');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
