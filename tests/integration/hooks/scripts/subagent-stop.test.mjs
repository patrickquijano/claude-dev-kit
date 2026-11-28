import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/subagent-stop.mjs', import.meta.url));
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });
const event = (message, extra = {}) => JSON.stringify({ last_assistant_message: message, ...extra });

test('cli: a failing proof prints a block decision and exits 0', () => {
  // Arrange
  const input = event('Status: done\nProof:\n- tests: exit 2\n');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).decision, 'block');
});

test('cli: a passing proof prints nothing', () => {
  // Arrange
  const input = event('Status: done\nProof:\n- tests: exit 0\n- lint: exit 0\n');
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: stop_hook_active lets a failing report through', () => {
  // Arrange
  const input = event('Status: done\nProof:\n- tests: exit 2\n', { stop_hook_active: true });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.stdout, '');
});

test('cli: invalid JSON prints one stderr line and exits 1', () => {
  // Arrange
  const input = 'garbage';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^cdk subagent-stop: .+\n$/);
  assert.equal(r.stdout, '');
});
