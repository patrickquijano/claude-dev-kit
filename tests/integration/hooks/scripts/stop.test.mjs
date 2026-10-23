import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/stop.mjs', import.meta.url));
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
