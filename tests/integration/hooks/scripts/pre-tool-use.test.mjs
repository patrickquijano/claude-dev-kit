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
